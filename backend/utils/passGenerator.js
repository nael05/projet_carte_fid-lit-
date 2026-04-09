/**
 * PassGenerator.js
 * Génère les fichiers .pkpass Apple Wallet à partir des données du client
 * Utilise passkit-generator officiel
 */

import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PassGenerator {
  constructor() {
    this.certPath = process.env.APPLE_CERT_PATH;
    this.wwdrCertPath = process.env.APPLE_WWDR_CERT_PATH;
    this.certPassword = process.env.APPLE_CERT_PASSWORD || '';
    this.teamId = process.env.APPLE_TEAM_ID;
    this.passTypeId = process.env.APPLE_PASS_TYPE_ID;
    this.webserviceUrl = process.env.APPLE_WALLET_WEBSERVICE_URL;

    // Ne pas valider au constructeur - faire au moment de l'utilisation
  }

  /**
   * Valide que tous les certificats et configs sont disponibles
   */
  validateConfiguration() {
    if (!this.certPath) {
      throw new Error('❌ VARIABLE ENV MANQUANTE: APPLE_CERT_PATH');
    }
    if (!this.wwdrCertPath) {
      throw new Error('❌ VARIABLE ENV MANQUANTE: APPLE_WWDR_CERT_PATH');
    }
    const requiredFiles = [this.certPath, this.wwdrCertPath];
    const requiredEnvs = ['APPLE_TEAM_ID', 'APPLE_PASS_TYPE_ID', 'APPLE_WALLET_WEBSERVICE_URL'];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`❌ CERTIFICAT MANQUANT: ${file}`);
      }
    }

    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        throw new Error(`❌ VARIABLE ENV MANQUANTE: ${env}`);
      }
    }

    logger.info('✅ Configuration Apple Wallet validée');
  }

  /**
   * Génère un passe Apple Wallet complet
   * @param {Object} clientData - Données du client
   * @param {Object} customization - Customization de couleurs/images
   * @param {string} serialNumber - Serial number unique du passe
   * @param {string} authToken - Token d'authentication
   * @returns {Buffer} - Buffer du fichier .pkpass
   */
  async generateLoyaltyPass(clientData, customization, serialNumber, authToken) {
    try {
      logger.info(`🎫 Génération pass pour client: ${clientData.clientId}`);

      // Lire les certificats
      const certificateBuffer = fs.readFileSync(this.certPath);
      const wwdrCertificate = fs.readFileSync(this.wwdrCertPath);

      // Créer l'instance PKPass
      const pass = new PKPass(
        {
          // Format pass
          passTypeIdentifier: this.passTypeId,
          teamIdentifier: this.teamId,
          serialNumber: serialNumber,
          description: customization?.apple_pass_description || 'Carte de Fidélité',

          // Stucture Loyalty Card Pass
          boardingPass: {
            transitType: 'generic',
          },

          // --- CONFIGURATION APPLE WALLET WEB SERVICE ---
          // CRITIQUE: Ces champs permettent à Apple Wallet de faire des requêtes vers notre backend
          webServiceURL: this.webserviceUrl,
          authenticationToken: authToken, // Doit être unique et sécurisé
          // Certificat associé (utilisé par Apple pour valider les requêtes)
          // Ce champ est optionnel si le service vérifie le header Authorization

          // --- APARENCE VISUELLE ---
          // Couleurs
          backgroundColor: customization?.apple_background_color || '#1f2937',
          labelColor: customization?.apple_label_color || '#a8a8a8',
          foregroundColor: customization?.apple_text_color || '#ffffff',

          // Organisation/Marque
          organizationName: customization?.apple_organization_name || clientData.companyName,

          // --- CONTENU PRINCIPAL ---
          // Champs principal (affichés en grand)
          primaryFields: [
            {
              key: 'balance',
              label: clientData.loyaltyType === 'stamps' ? 'Tampons' : 'Points',
              value: clientData.loyaltyType === 'stamps' 
                ? `${clientData.balance}/${clientData.stampMaxCount || 10}`
                : `${clientData.balance}`,
              // Optionnel: changer le format d'affichage
              changeMessage: clientData.loyaltyType === 'stamps'
                ? 'Nouveau tampon: %@'
                : 'Nouveaux points: +%@',
            },
          ],

          // Champs auxiliaires (affichés en petit)
          auxiliaryFields: [
            {
              key: 'client_name',
              label: 'Client',
              value: `${clientData.firstName} ${clientData.lastName}`,
            },
            {
              key: 'member_since',
              label: 'Membre depuis',
              value: clientData.createdAt ? new Date(clientData.createdAt).toLocaleDateString('fr-FR') : '',
            },
          ],

          // Champs secondaires (affichés plus bas)
          secondaryFields: [
            {
              key: 'phone',
              label: 'Téléphone',
              value: clientData.phoneNumber || 'N/A',
            },
          ],

          // --- QR CODE / BARCODE ---
          // Le barcode est ce qu'on scanne en magasin
          barcodes: [
            {
              format: 'QR',
              messageEncoding: 'iso-8859-1',
              // La valeur du QR doit être unique et stable (clientId ou wallet_card_id)
              message: clientData.qrCodeValue,
            },
          ],

          // Également disponible en format alternatif (rétrocompatibilité)
          barcode: {
            format: 'QR',
            messageEncoding: 'iso-8859-1',
            message: clientData.qrCodeValue,
            altText: `ID: ${clientData.clientId}`,
          },

          // --- INTERACTION ---
          // URL où l'utilisateur peut gérer sa carte
          associatedStoreIdentifiers: [],
          // Peut être utilisé pour la gestion (optionnel)
          relevantDate: null,

          // --- IMAGES (optionnel mais recommandé) ---
          // Assure que les chemins existent
          images: {
            // Logo de la marque (format: logo.png)
            // Dimensions recommandées: 320x320px (@2x: 640x640px, @3x: 960x960px)
            logo: customization?.apple_logo_url || null,

            // Icône (petite)
            // Dimensions: 40x40px (@2x: 80x80px, @3x: 120x120px)
            icon: customization?.apple_icon_url || null,

            // Image au-dessus du pass (bannière)
            // Dimensions: 1125x284px
            strip: customization?.apple_strip_image_url || null,
          },
        },
        certificateBuffer,
        [wwdrCertificate]
      );

      // Ajouter le mot de passe du certificat si fourni
      if (this.certPassword) {
        pass.passPassword = this.certPassword;
      }

      // Générer le buffer du fichier .pkpass
      const passBuffer = await pass.getAsBuffer();

      logger.info(`✅ Pass généré avec succès (serial: ${serialNumber})`);
      return passBuffer;
    } catch (error) {
      logger.error(`❌ Erreur génération pass: ${error.message}`);
      throw error;
    }
  }

  /**
   * Génère un nouveau pass avec les valeurs à jour du client
   * Appelé lors d'une requête GET /v1/passes/:passTypeIdentifier/:serialNumber
   * @param {Object} clientData - Données à jour du client
   * @param {Object} customization - Customization
   * @param {string} serialNumber - Serial number
   * @param {string} authToken - Auth token
   * @returns {Buffer} - Nouveau buffer .pkpass
   */
  async generateUpdatedPass(clientData, customization, serialNumber, authToken) {
    logger.info(`🔄 Génération pass mis à jour (serial: ${serialNumber})`);
    return this.generateLoyaltyPass(clientData, customization, serialNumber, authToken);
  }

  /**
   * Utilitaire: créer les répertoires de cache si nécessaire
   */
  static ensurePassDirectory() {
    const passDir = path.join(__dirname, '../passes');
    if (!fs.existsSync(passDir)) {
      fs.mkdirSync(passDir, { recursive: true });
    }
    return passDir;
  }
}

// Exporter une instance singleton (lazy-loaded avec Proxy)
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new PassGenerator();
  }
  return instance;
}

export const passGenerator = new Proxy({}, {
  get(target, property) {
    return getInstance()[property];
  }
});

export default passGenerator;
