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
      if (urlOrPath.startsWith('uploads/')) {
        const fullPath = path.resolve(__dirname, '..', urlOrPath);
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath);
        }
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

      const logoBuffer = await this.fetchImageBuffer(customization?.apple_logo_url);
      if (logoBuffer) {
        await template.images.add("logo", logoBuffer);
      } else {
        const defaultLogo = await this.fetchImageBuffer('https://dummyimage.com/160x50/000/fff.png&text=Logo');
        if (defaultLogo) await template.images.add("logo", defaultLogo);
      }

      const iconBuffer = await this.fetchImageBuffer(customization?.apple_icon_url);
      if (iconBuffer) {
        await template.images.add("icon", iconBuffer);
      } else {
        const defaultIcon = await this.fetchImageBuffer('https://dummyimage.com/29x29/000/fff.png&text=Icon');
        if (defaultIcon) await template.images.add("icon", defaultIcon);
      }

      const stripBuffer = await this.fetchImageBuffer(customization?.apple_strip_image_url);
      if (stripBuffer) {
        await template.images.add("strip", stripBuffer);
      }

      const pass = template.createPass({
        serialNumber: String(serialNumber),
        description: customization?.apple_pass_description || 'Carte de fidélité numérique'
      });

      if (customization?.latitude && customization?.longitude) {
        pass.locations.add({
          latitude: Number(customization.latitude),
          longitude: Number(customization.longitude),
          relevantText: customization.relevant_text || customization.relevantText || 'Boutique à proximité'
        });
      }
      // --- LAYOUT PREMIUM (Style KFC) ---
      
      // 1. Points (Header)
      pass.headerFields.add({
        key: 'points_header',
        label: 'POINTS',
        value: `${clientData.balance || 0}`
      });

      // 2. Bonjour [Prénom] & Détails (Secondary Fields - Pour être sous la bannière sur iOS)
      pass.secondaryFields.add({
        key: 'greeting',
        label: 'BONJOUR',
        value: (clientData.firstName || 'Client').toUpperCase()
      });

      pass.secondaryFields.add({
        key: 'reward_hint',
        label: 'DÉTAILS DES RÉCOMPENSES',
        value: 'Au dos 👆 ...'
      });

      // 4. Barcode + ID Court
      const shortId = clientData.clientId ? String(clientData.clientId).slice(-6).toUpperCase() : 'N/A';
      pass.barcodes = [
        {
          format: "PKBarcodeFormatQR",
          message: String(clientData.clientId),
          messageEncoding: "iso-8859-1",
          altText: `N° Carte : ${shortId}`
        }
      ];

      // 5. Back Infos
      // --- DOS DE LA CARTE (Back Fields) ---
      
      // 1. Entreprise & Site Web
      pass.backFields.add({
        key: 'company_info',
        label: 'ENTREPRISE',
        value: clientData.companyName || 'Boutique',
      });

      if (customization?.back_fields_website) {
        pass.backFields.add({
          key: 'website',
          label: 'SITE WEB',
          value: customization.back_fields_website
        });
      }

      // 2. Contact & Réseaux Sociaux
      if (customization?.back_fields_phone) {
        pass.backFields.add({
          key: 'phone',
          label: 'TÉLÉPHONE',
          value: customization.back_fields_phone,
          dataDetectorTypes: ['PKDataDetectorTypePhoneNumber']
        });
      }

      if (customization?.back_fields_address) {
        pass.backFields.add({
          key: 'address',
          label: 'ADRESSE',
          value: customization.back_fields_address,
          dataDetectorTypes: ['PKDataDetectorTypeAddress']
        });
      }

      if (customization?.back_fields_instagram) {
        pass.backFields.add({
          key: 'instagram',
          label: 'INSTAGRAM',
          value: customization.back_fields_instagram.startsWith('@') ? customization.back_fields_instagram : `@${customization.back_fields_instagram}`
        });
      }

      if (customization?.back_fields_facebook) {
        pass.backFields.add({
          key: 'facebook',
          label: 'FACEBOOK',
          value: customization.back_fields_facebook
        });
      }

      if (customization?.back_fields_tiktok) {
        pass.backFields.add({
          key: 'tiktok',
          label: 'TIKTOK',
          value: customization.back_fields_tiktok.startsWith('@') ? customization.back_fields_tiktok : `@${customization.back_fields_tiktok}`
        });
      }

      // 3. Conditions d'utilisation
      if (customization?.back_fields_terms) {
        pass.backFields.add({
          key: 'terms',
          label: 'CONDITIONS',
          value: customization.back_fields_terms
        });
      }

      // 4. Paliers de récompenses (Automatique)
      if (clientData.rewardTiers && clientData.rewardTiers.length > 0) {
        const tiersList = clientData.rewardTiers.map(t => `- ${t.points_required} pts : ${t.title}`).join('\n');
        pass.backFields.add({
          key: 'rewards_tiers',
          label: 'PALIERS DE RÉCOMPENSES',
          value: tiersList
        });
      }

      // 5. Informations complémentaires
      if (customization?.back_fields_info) {
        pass.backFields.add({
          key: 'extra_info',
          label: 'INFOS COMPLÉMENTAIRES',
          value: customization.back_fields_info
        });
      }

      // Proximité (GPS)
      if (customization?.latitude && customization?.longitude) {
        pass.locations.add({
          latitude: Number(customization.latitude),
          longitude: Number(customization.longitude),
          relevantText: customization.relevant_text || 'Boutique à proximité'
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
