/**
 * PassGenerator.js
 * Génère les fichiers .pkpass Apple Wallet à partir des données du client
 * Utilise @walletpass/pass-js (supporte P12 nativement)
 */

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
    if (this.configLoaded) return;

    this.certPath = process.env.APPLE_CERT_PATH;
    this.keyPath = process.env.APPLE_KEY_PATH || this.certPath;
    this.certPassword = process.env.APPLE_CERT_PASSWORD || '';
    this.teamId = process.env.APPLE_TEAM_ID;
    this.passTypeId = process.env.APPLE_PASS_TYPE_ID;
    this.webserviceUrl = process.env.APPLE_WALLET_WEBSERVICE_URL;

    // Convertir en chemins absolus si relatifs
    if (this.certPath && !path.isAbsolute(this.certPath)) {
      this.certPath = path.resolve(__dirname, '..', this.certPath);
    }
    if (this.keyPath && !path.isAbsolute(this.keyPath)) {
      this.keyPath = path.resolve(__dirname, '..', this.keyPath);
    }

    this.configLoaded = true;
    logger.debug('⚙️ Configuration PassGenerator chargée');
  }

  /**
   * Valide que tous les certificats et configs sont disponibles
   */
  validateConfiguration() {
    this._loadConfig();
    if (!this.certPath) {
      throw new Error('❌ VARIABLE ENV MANQUANTE: APPLE_CERT_PATH');
    }
    
    if (!fs.existsSync(this.certPath)) {
      throw new Error(`❌ CERTIFICAT MANQUANT: ${this.certPath}`);
    }

    const requiredEnvs = ['APPLE_TEAM_ID', 'APPLE_PASS_TYPE_ID', 'APPLE_WALLET_WEBSERVICE_URL'];
    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        throw new Error(`❌ VARIABLE ENV MANQUANTE: ${env}`);
      }
    }

    logger.info('✅ Configuration Apple Wallet validée');
  }

  /**
   * Helper pour télécharger une image
   */
  async fetchImageBuffer(url) {
    if (!url) return null;
    try {
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 5000 // 5 seconds timeout
      });
      return Buffer.from(response.data, 'binary');
    } catch (e) {
      logger.warn(`Impossible de télécharger l'image: ${url} (${e.message})`);
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

      // Ajouter les images si présentes
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
      if (stripBuffer) {
        await template.images.add("strip", stripBuffer);
      } else if (clientData.loyaltyType === 'stamps') {
        // Générer dynamiquement une image strip avec les tampons visuels
        const accentColor = customization?.apple_label_color || '#3b82f6';
        const bgColor = customization?.apple_background_color || '#1f2937';
        const stampStrip = await generateStampStrip(
          clientData.balance || 0,
          clientData.stampMaxCount || 10,
          accentColor,
          '#4b5563',  // couleur des cercles vides
          bgColor
        );
        if (stampStrip) {
          await template.images.add("strip", stampStrip);
        }
      }

      // Création du passe individuel à partir du template
      const pass = template.createPass({
        serialNumber: String(serialNumber),
      });

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
