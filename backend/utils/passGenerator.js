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
import { generateStampStrip } from './stampImageGenerator.js';

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
    if (this.configLoaded) return true;

    this.certPath = process.env.APPLE_CERT_PATH;
    this.keyPath = process.env.APPLE_KEY_PATH || this.certPath;
    this.certPassword = process.env.APPLE_CERT_PASSWORD || '';
    this.teamId = process.env.APPLE_TEAM_ID;
    this.passTypeId = process.env.APPLE_PASS_TYPE_ID;
    this.webserviceUrl = process.env.APPLE_WALLET_WEBSERVICE_URL;
    
    // Normaliser l'URL (enlever le slash final s'il existe pour éviter les 404)
    if (this.webserviceUrl && this.webserviceUrl.endsWith('/')) {
      this.webserviceUrl = this.webserviceUrl.slice(0, -1);
    }

    // Sécurité: Si certPath est manquant, on ne marque pas comme chargé
    if (!this.certPath) {
      logger.error('❌ APPLE_CERT_PATH est manquant dans .env. La génération de pass va échouer.');
      return false;
    }

    // Convertir en chemins absolus si relatifs
    if (typeof this.certPath === 'string' && !path.isAbsolute(this.certPath)) {
      this.certPath = path.resolve(__dirname, '..', this.certPath);
    }
    if (typeof this.keyPath === 'string' && !path.isAbsolute(this.keyPath)) {
      this.keyPath = path.resolve(__dirname, '..', this.keyPath);
    }

    this.configLoaded = true;
    logger.info('⚙️ Configuration PassGenerator chargée avec succès');
    return true;
  }

  /**
   * Valide que tous les certificats et configs sont disponibles
   */
  validateConfiguration() {
    if (!this._loadConfig()) {
      logger.warn('⚠️ Configuration Apple Wallet incomplète (APPLE_CERT_PATH manquant). La génération de pass Apple sera indisponible.');
      return false;
    }
    
    if (!fs.existsSync(this.certPath)) {
      logger.warn(`⚠️ CERTIFICAT APPLE MANQUANT: ${this.certPath}. La génération de pass Apple sera indisponible.`);
      return false;
    }

    const requiredEnvs = ['APPLE_TEAM_ID', 'APPLE_PASS_TYPE_ID', 'APPLE_WALLET_WEBSERVICE_URL'];
    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        logger.warn(`⚠️ VARIABLE ENV APPLE MANQUANTE: ${env}. La génération de pass Apple sera indisponible.`);
        return false;
      }
    }

    logger.info('✅ Configuration Apple Wallet validée');
    return true;
  }

  /**
   * Helper pour obtenir le buffer d'une image (URL ou disque local)
   */
  async fetchImageBuffer(urlOrPath) {
    if (!urlOrPath) return null;
    
    try {
      // 1. Si c'est un chemin local (relatif à la racine du backend)
      if (urlOrPath.startsWith('uploads/')) {
        const fullPath = path.resolve(__dirname, '..', urlOrPath);
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath);
        }
        logger.warn(`Image locale manquante sur le disque: ${fullPath}`);
      }

      // 2. Si c'est une URL HTTP
      if (urlOrPath.startsWith('http')) {
        const response = await axios.get(urlOrPath, { 
          responseType: 'arraybuffer',
          timeout: 5000 
        });
        return Buffer.from(response.data, 'binary');
      }

      return null;
    } catch (e) {
      logger.warn(`Impossible de charger l'image: ${urlOrPath} (${e.message})`);
      return null;
    }
  }

  /**
   * Helper pour extraire le PEM pur (enlève les Bag Attributes générés par OpenSSL)
   */
  extractPEM(buffer) {
    const str = buffer.toString('utf8');
    const match = str.match(/-----BEGIN [\s\S]+?-----END [\s\S]+?-----/);
    return match ? match[0] : str;
  }

  /**
   * Génère un passe Apple Wallet complet
   */
  async generateLoyaltyPass(clientData, customization, serialNumber, authToken) {
    try {
      this._loadConfig();
      logger.info(`🎫 Génération pass pour client: ${clientData.clientId}`);

      const certificateBuffer = fs.readFileSync(this.certPath);
      const keyBuffer = fs.readFileSync(this.keyPath);

      // Créer le Template
      const template = new Template("storeCard", {
        passTypeIdentifier: this.passTypeId,
        teamIdentifier: this.teamId,
        organizationName: customization?.apple_organization_name || clientData.companyName || 'Organisation',
        description: customization?.apple_pass_description || 'Carte de Fidélité',
        backgroundColor: customization?.apple_background_color || 'rgb(31,41,55)',
        labelColor: customization?.apple_label_color || 'rgb(168,168,168)',
        foregroundColor: customization?.apple_text_color || 'rgb(255,255,255)',
        webServiceURL: this.webserviceUrl,
        authenticationToken: authToken,
      });

      // Nettoyer les PEMs (enlever les attributes OpenSSL)
      const cleanCert = this.extractPEM(certificateBuffer);
      const cleanKey = this.extractPEM(keyBuffer);

      template.setCertificate(cleanCert);
      template.setPrivateKey(cleanKey, this.certPassword || undefined);

      // Ajouter les images si présentes (supporte les nouveaux chemins relatifs)
      const logoBuffer = await this.fetchImageBuffer(customization?.apple_logo_url);
      if (logoBuffer) {
        await template.images.add("logo", logoBuffer);
      } else {
        const defaultLogo = await this.fetchImageBuffer('https://dummyimage.com/160x50/000/fff.png&text=Logo');
        if (defaultLogo) {
            await template.images.add("logo", defaultLogo);
        }
      }

      const iconBuffer = await this.fetchImageBuffer(customization?.apple_icon_url);
      if (iconBuffer) {
        await template.images.add("icon", iconBuffer);
      } else {
        const defaultIcon = await this.fetchImageBuffer('https://dummyimage.com/29x29/000/fff.png&text=Icon');
        if (defaultIcon) {
            await template.images.add("icon", defaultIcon);
        }
      }

      const stripBuffer = await this.fetchImageBuffer(customization?.apple_strip_image_url);
      
      if (clientData.loyaltyType === 'stamps') {
        // En mode TAMPONS, on génère TOUJOURS le strip dynamique
        // mais on lui passe le stripBuffer (la photo) comme fond si elle existe
        const accentColor = customization?.apple_label_color || '#3b82f6';
        const bgColor = customization?.apple_background_color || '#1f2937';
        const stampStrip = await generateStampStrip(
          Number(clientData.balance || 0),
          Number(clientData.stampMaxCount || 10),
          accentColor,
          '#4b5563',  // couleur des cercles vides
          bgColor,
          stripBuffer // Le fond optionnel (SI null, fond uni utilisé)
        );
        if (stampStrip) {
          await template.images.add("strip", stampStrip);
        }
      } else if (stripBuffer) {
        // En mode POINTS, on utilise juste la photo si elle existe
        await template.images.add("strip", stripBuffer);
      }

      // Création du passe individuel à partir du template
      const pass = template.createPass({
        serialNumber: String(serialNumber),
      });

      // Géolocalisation (Premium Feature)
      if (customization?.latitude && customization?.longitude) {
        pass.locations.add({
          latitude: Number(customization.latitude),
          longitude: Number(customization.longitude),
          relevantText: customization.relevant_text || 'Boutique à proximité'
        });
      }

      // Titre de la récompense (Visible sur le devant)
      if (clientData.rewardTitle) {
        pass.headerFields.add({
          key: 'reward',
          label: 'OFFRE',
          value: clientData.rewardTitle
        });
      }

      // Champs principal
      if (clientData.loyaltyType !== 'stamps') {
        const goal = clientData.pointsGoal || 10;
        pass.primaryFields.add({
          key: 'balance',
          label: 'Points',
          value: `${clientData.balance} / ${goal}`,
          changeMessage: 'Nouveaux points: +%@',
        });
      }

      // Champs auxiliaires
      pass.auxiliaryFields.add({
        key: 'client_name',
        label: 'Client',
        value: `${clientData.firstName} ${clientData.lastName}`,
      });

      if (clientData.createdAt) {
        pass.auxiliaryFields.add({
          key: 'member_since',
          label: 'Membre depuis',
          value: new Date(clientData.createdAt).toLocaleDateString('fr-FR'),
        });
      }

      // Champs secondaires
      pass.secondaryFields.add({
        key: 'phone',
        label: 'Téléphone',
        value: clientData.phoneNumber || 'N/A',
      });

      // Barcode
      pass.barcodes = [
        {
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1',
          message: String(clientData.qrCodeValue),
          altText: `ID: ${clientData.clientId}`,
        }
      ];

      // Texte du logo
      if (customization?.logo_text) {
        pass.logoText = customization.logo_text;
      }

      // Champs au verso (Back Fields)
      if (customization?.back_fields_info) {
        pass.backFields.add({
          key: 'info',
          label: 'À propos',
          value: customization.back_fields_info
        });
      }

      if (customization?.back_fields_terms) {
        pass.backFields.add({
          key: 'terms',
          label: 'Conditions Générales',
          value: customization.back_fields_terms
        });
      }

      if (customization?.back_fields_website) {
        pass.backFields.add({
          key: 'website',
          label: 'Site Web',
          value: customization.back_fields_website
        });
      }

      // Générer le buffer du fichier .pkpass
      const passBuffer = await pass.asBuffer();

      logger.info(`✅ Pass généré avec succès (serial: ${serialNumber})`);
      return passBuffer;
    } catch (error) {
      logger.error(`❌ Erreur génération pass: ${error.message}`);
      throw error;
    }
  }

  async generateUpdatedPass(clientData, customization, serialNumber, authToken) {
    logger.info(`🔄 Génération pass mis à jour (serial: ${serialNumber})`);
    return this.generateLoyaltyPass(clientData, customization, serialNumber, authToken);
  }

  static ensurePassDirectory() {
    const passDir = path.join(__dirname, '../passes');
    if (!fs.existsSync(passDir)) {
      fs.mkdirSync(passDir, { recursive: true });
    }
    return passDir;
  }
}

let instance = null;

function getInstance() {
  if (!instance) {
    instance = new PassGenerator();
  }
  return instance;
}

// Export direct de l'instance (le singleton)
const passGenerator = getInstance();
export { passGenerator };
export default passGenerator;
