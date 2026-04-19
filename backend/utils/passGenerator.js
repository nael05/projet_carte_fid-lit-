/**
 * PassGenerator.js
 * Génère les fichiers .pkpass Apple Wallet à partir des données du client
 * Utilise @walletpass/pass-js (supporte P12 nativement)
 */

import 'dotenv/config';
import { Template } from '@walletpass/pass-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PassGenerator {
  constructor() {
    this.configLoaded = false;
  }

  /**
   * Charge la configuration une seule fois de manière paresseuse
   */
  _loadConfig() {
    try {
      if (this.configLoaded) return true;

      this.certPath = process.env.APPLE_CERT_PATH;
      this.keyPath = process.env.APPLE_KEY_PATH || this.certPath;
      
      // Convertir en chemins absolus si nécessaire
      if (this.certPath && !path.isAbsolute(this.certPath)) {
        this.certPath = path.resolve(__dirname, '..', this.certPath);
      }
      if (this.keyPath && !path.isAbsolute(this.keyPath)) {
        this.keyPath = path.resolve(__dirname, '..', this.keyPath);
      }

      this.certPassword = process.env.APPLE_CERT_PASSWORD || '';
      this.teamId = process.env.APPLE_TEAM_ID;
      this.passTypeId = process.env.APPLE_PASS_TYPE_ID;
      this.webserviceUrl = process.env.APPLE_WALLET_WEBSERVICE_URL;

      // Normaliser l'URL
      if (typeof this.webserviceUrl === 'string' && this.webserviceUrl.endsWith('/')) {
        this.webserviceUrl = this.webserviceUrl.slice(0, -1);
      }

      if (!this.certPath) {
        logger.warn('⚠️ APPLE_CERT_PATH est manquant. Apple Wallet sera désactivé.');
        return false;
      }

      this.configLoaded = true;
      return true;
    } catch (err) {
      logger.error('❌ Erreur chargement config PassGenerator:', err.message);
      return false;
    }
  }

  /**
   * Valide que tous les certificats et configs sont disponibles
   */
  validateConfiguration() {
    if (!this._loadConfig()) {
      logger.warn('⚠️ Configuration Apple Wallet incomplète (APPLE_CERT_PATH manquant).');
      return false;
    }

    if (!fs.existsSync(this.certPath)) {
      logger.warn(`⚠️ CERTIFICAT APPLE MANQUANT: ${this.certPath}.`);
      return false;
    }

    const requiredEnvs = ['APPLE_TEAM_ID', 'APPLE_PASS_TYPE_ID', 'APPLE_WALLET_WEBSERVICE_URL'];
    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        logger.warn(`⚠️ VARIABLE ENV APPLE MANQUANTE: ${env}.`);
        return false;
      }
    }

    return true;
  }

  /**
   * Helper pour obtenir le buffer d'une image (URL ou disque local)
   */
  async fetchImageBuffer(urlOrPath) {
    if (!urlOrPath || typeof urlOrPath !== 'string') return null;

    try {
      // Détection plus robuste des fichiers locaux dans le dossier 'uploads'
      const isLocalUpload = urlOrPath.includes('uploads/');
      if (isLocalUpload) {
        // Diagnostic : voir d'où on part
        const currentCwd = process.cwd();
        
        // Nettoyer le chemin (enlever le slash initial s'il existe et tout ce qui précède 'uploads/')
        const cleanPath = urlOrPath.substring(urlOrPath.indexOf('uploads/'));
        
        // TENTATIVE 1 : Chemin relatif direct (souvent le bon en PM2)
        let fullPath = path.resolve(currentCwd, cleanPath);
        if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);

        // TENTATIVE 2 : Remonter d'un cran (cas backend/backend)
        fullPath = path.resolve(currentCwd, '..', cleanPath);
        if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);
        
        // TENTATIVE 3 : Descendre d'un cran (cas racine projet)
        fullPath = path.resolve(currentCwd, 'backend', cleanPath);
        if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);

        // TENTATIVE 4 : Chemin absolu VPS (Hardcoded fallback)
        fullPath = path.join('/var/www/projet_carte_fid-lit-/backend', cleanPath);
        if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);

        logger.debug(`⚠️ Image introuvable. Tentatives échouées pour: ${cleanPath}`);
      }
      
      if (urlOrPath.startsWith('http')) {
        const response = await axios.get(urlOrPath, {
          responseType: 'arraybuffer',
          timeout: 5000
        });
        return Buffer.from(response.data, 'binary');
      }
      return null;
    } catch (e) {
      logger.error(`❌ Erreur fetchImageBuffer pour [${urlOrPath}]: ${e.message}`);
      return null;
    }
  }

  /**
   * Helper pour extraire le PEM pur
   */
  extractPEM(buffer) {
    const str = buffer.toString('utf8');
    const match = str.match(/-----BEGIN [\s\S]+?-----END [\s\S]+?-----/);
    return match ? match[0] : str;
  }

  /**
   * Ajoute une image de manière sécurisée (évite le crash undefined 'add')
   */
  async safeAddImage(target, type, buffer) {
    try {
      if (!buffer) return false;
      if (target && target.images && typeof target.images.add === 'function') {
        await target.images.add(type, buffer);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Ajoute un champ à une collection de manière sécurisée
   */
  safeAddField(collection, data) {
    try {
      if (collection && typeof collection.add === 'function') {
        collection.add(data);
        return true;
      }
      return false;
    } catch (e) {
      logger.error(`❌ Erreur safeAddField: ${e.message}`);
      return false;
    }
  }

  /**
   * Ajoute une localisation de manière sécurisée
   */
  safeAddLocation(pass, locData) {
    try {
      if (pass) {
        if (typeof pass.addLocation === 'function') {
          pass.addLocation(locData);
          return true;
        }
        
        const currentLocations = Array.isArray(pass.locations) ? pass.locations : [];
        currentLocations.push(locData);
        pass.locations = currentLocations;
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Génère un passe Apple Wallet complet
   */
  async generateLoyaltyPass(clientData, customization, serialNumber, authToken, options = {}) {
    try {
      if (!this._loadConfig()) {
        logger.warn('⚠️ PassGenerator non configuré (certificat absent). Génération annulée.');
        return null;
      }

      if (!fs.existsSync(this.certPath)) {
        logger.warn(`⚠️ Certificat Apple absent du disque: ${this.certPath}`);
        return null;
      }

      logger.info(`🎫 Génération pass pour client: ${clientData.clientId}`);

      const certificateBuffer = fs.readFileSync(this.certPath);
      const keyBuffer = fs.readFileSync(this.keyPath);

      const template = new Template("storeCard", {
        passTypeIdentifier: this.passTypeId,
        teamIdentifier: this.teamId,
        organizationName: customization?.apple_organization_name || clientData.companyName || 'Organisation',
        description: customization?.apple_pass_description || 'Carte de Fidélité',
        backgroundColor: customization?.apple_background_color || 'rgb(31,41,55)',
        labelColor: customization?.apple_label_color || 'rgb(168,168,168)',
        foregroundColor: customization?.apple_text_color || 'rgb(255,255,255)',
        logoText: customization?.logo_text || clientData.companyName || '',
        webServiceURL: options.webServiceURL || this.webserviceUrl,
        authenticationToken: authToken,
      });

      const cleanCert = this.extractPEM(certificateBuffer);
      const cleanKey = this.extractPEM(keyBuffer);

      template.setCertificate(cleanCert);
      template.setPrivateKey(cleanKey, this.certPassword || undefined);

      // 2. Chargement PARALLÈLE des images
      // Fallback robuste : si apple_logo_url est vide, on utilise logo_url
      const finalLogoUrl = customization?.apple_logo_url || customization?.logo_url;
      const finalIconUrl = customization?.apple_icon_url || customization?.icon_url;
      const finalStripUrl = customization?.apple_strip_image_url || customization?.strip_image_url;

      const [logoBuffer, iconBuffer, stripBuffer] = await Promise.all([
        this.fetchImageBuffer(finalLogoUrl),
        this.fetchImageBuffer(finalIconUrl),
        this.fetchImageBuffer(finalStripUrl)
      ]);

      // Ajout sécurisé des images
      await this.safeAddImage(template, "logo", logoBuffer);
      await this.safeAddImage(template, "icon", iconBuffer);
      if (stripBuffer) {
        await this.safeAddImage(template, "strip", stripBuffer);
      }

      // Fallbacks par défaut (Images visibles si rien n'est trouvé pour éviter les espaces vides)
      if (!iconBuffer) {
        const defaultIcon = await this.fetchImageBuffer('https://dummyimage.com/29x29/000/fff.png&text=Icon');
        if (defaultIcon) await this.safeAddImage(template, "icon", defaultIcon);
      }
      if (!logoBuffer) {
        const defaultLogo = await this.fetchImageBuffer('https://dummyimage.com/160x50/000/fff.png&text=Logo');
        if (defaultLogo) await this.safeAddImage(template, "logo", defaultLogo);
      }

      const pass = template.createPass({
        serialNumber: String(serialNumber),
        description: customization?.apple_pass_description || 'Carte de fidélité numérique'
      });

      let locationsArray = [];
      if (customization?.locations) {
        try {
          locationsArray = typeof customization.locations === 'string' 
            ? JSON.parse(customization.locations) 
            : customization.locations;
        } catch (e) {
          // ignore parsing error
        }
      }

      if (Array.isArray(locationsArray) && locationsArray.length > 0) {
        locationsArray.slice(0, 10).forEach(loc => {
          if (loc.latitude && loc.longitude) {
            this.safeAddLocation(pass, {
              latitude: Number(loc.latitude),
              longitude: Number(loc.longitude),
              relevantText: loc.relevantText || customization.relevant_text || 'Boutique à proximité'
            });
          }
        });
      } else if (customization?.latitude && customization?.longitude) {
        this.safeAddLocation(pass, {
          latitude: Number(customization.latitude),
          longitude: Number(customization.longitude),
          relevantText: customization.relevant_text || customization.relevantText || 'Boutique à proximité'
        });
      }

      // --- LAYOUT PREMIUM (Style Fidelyz) ---
      
      // 1. Points (Header)
      this.safeAddField(pass.headerFields, {
        key: 'points_header',
        label: 'POINTS',
        value: `${clientData.balance || 0}`,
        changeMessage: "Solde mis à jour : %@ points"
      });

      // 2. Bonjour (Secondary)
      this.safeAddField(pass.secondaryFields, {
        key: 'greeting',
        label: 'BONJOUR',
        value: (clientData.firstName || 'Client').toUpperCase()
      });

      this.safeAddField(pass.secondaryFields, {
        key: 'reward_hint',
        label: 'DÉTAILS DES RÉCOMPENSES',
        value: 'Au dos 👆 ...'
      });

      // 4. Barcode
      const shortId = clientData.clientId ? String(clientData.clientId).slice(-6).toUpperCase() : 'N/A';
      pass.barcodes = [
        {
          format: "PKBarcodeFormatQR",
          message: String(clientData.clientId),
          messageEncoding: "iso-8859-1",
          altText: `N° Carte : ${shortId}`
        }
      ];

      this.safeAddField(pass.backFields, {
        key: 'company_info',
        label: 'ENTREPRISE',
        value: customization?.apple_organization_name || clientData.companyName || 'Boutique',
      });

      if (customization?.back_fields_website) {
        this.safeAddField(pass.backFields, {
          key: 'website',
          label: 'SITE WEB',
          value: customization.back_fields_website
        });
      }

      if (customization?.back_fields_phone) {
        this.safeAddField(pass.backFields, {
          key: 'phone',
          label: 'TÉLÉPHONE',
          value: customization.back_fields_phone,
          dataDetectorTypes: ['PKDataDetectorTypePhoneNumber']
        });
      }

      if (customization?.back_fields_address) {
        this.safeAddField(pass.backFields, {
          key: 'address',
          label: 'ADRESSE',
          value: customization.back_fields_address,
          dataDetectorTypes: ['PKDataDetectorTypeAddress']
        });
      }

      if (customization?.back_fields_instagram) {
        this.safeAddField(pass.backFields, {
          key: 'instagram',
          label: 'INSTAGRAM',
          value: customization.back_fields_instagram.startsWith('@') ? customization.back_fields_instagram : `@${customization.back_fields_instagram}`
        });
      }

      if (customization?.back_fields_facebook) {
        this.safeAddField(pass.backFields, {
          key: 'facebook',
          label: 'FACEBOOK',
          value: customization.back_fields_facebook
        });
      }

      if (customization?.back_fields_tiktok) {
        this.safeAddField(pass.backFields, {
          key: 'tiktok',
          label: 'TIKTOK',
          value: customization.back_fields_tiktok.startsWith('@') ? customization.back_fields_tiktok : `@${customization.back_fields_tiktok}`
        });
      }

      if (customization?.back_fields_terms) {
        this.safeAddField(pass.backFields, {
          key: 'terms',
          label: 'CONDITIONS',
          value: customization.back_fields_terms
        });
      }

      if (clientData.rewardTiers && clientData.rewardTiers.length > 0) {
        const tiersList = clientData.rewardTiers.map(t => `- ${t.points_required} pts : ${t.title}`).join('\n');
        this.safeAddField(pass.backFields, {
          key: 'rewards_tiers',
          label: 'PALIERS DE RÉCOMPENSES',
          value: tiersList,
          changeMessage: "Liste des récompenses mise à jour !"
        });
      }

      if (customization?.back_fields_info) {
        this.safeAddField(pass.backFields, {
          key: 'extra_info',
          label: 'INFOS COMPLÉMENTAIRES',
          value: customization.back_fields_info
        });
      }

      // --- SECTION PROMO AU DOS (Comme demandé) ---
      if (customization?.relevant_text) {
        this.safeAddField(pass.backFields, {
          key: 'promotion',
          label: 'OFFRE EN COURS',
          value: customization.relevant_text,
          changeMessage: "Nouvelle offre : %@"
        });
      }


      return await pass.asBuffer();
    } catch (error) {
      logger.error('❌ Erreur lors de la génération Apple Wallet Pass', {
        clientId: clientData.clientId,
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Alias pour generateLoyaltyPass, utilisé par le Webservice Apple
   */
  async generateUpdatedPass(clientData, customization, serialNumber, authToken) {
    return this.generateLoyaltyPass(clientData, customization, serialNumber, authToken);
  }

  /**
   * Recharge un buffer avec d'anciennes données pour les mises à jour push
   */
  async updatePassFields(passBuffer, updates) {
    try {
      if (!this._loadConfig()) {
        logger.warn('⚠️ Mission impossible: config passGenerator manquante pour updatePassFields');
        return passBuffer;
      }

      if (!fs.existsSync(this.certPath) || !fs.existsSync(this.keyPath)) {
        logger.warn('⚠️ Certificats manquants pour updatePassFields');
        return passBuffer;
      }

      const certificateBuffer = fs.readFileSync(this.certPath);
      const keyBuffer = fs.readFileSync(this.keyPath);

      const cleanCert = this.extractPEM(certificateBuffer);
      const cleanKey = this.extractPEM(keyBuffer);

      if (!cleanCert || !cleanKey) {
        logger.error('❌ PEM extraction failed');
        return passBuffer;
      }

      const pass = await Template.load(passBuffer);
      pass.setCertificate(cleanCert);
      pass.setPrivateKey(cleanKey, this.certPassword || undefined);

      pass.primaryFields.forEach(field => {
        if (field.key === 'balance' && updates.balance !== undefined) {
          field.value = `${updates.balance} pts`;
        }
      });
      pass.headerFields.forEach(field => {
        if (field.key === 'points_header' && updates.balance !== undefined) {
          field.value = `${updates.balance}`;
        }
      });

      return await pass.asBuffer();
    } catch (error) {
      logger.error('Failed to update pass fields:', error.message);
      throw error;
    }
  }
}

export default new PassGenerator();
