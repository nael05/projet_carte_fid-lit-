/**
 * Apple Wallet Pass Generator
 * Module dédié pour la génération sécurisée et propre des passes Apple Wallet
 * 
 * Utilise : passkit-generator v3.3.0
 * Certificat : backend/certs/apple-wallet-cert.p12 (Pass Type ID Certificate)
 */

import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Configuration par défaut pour Apple Wallet
 */
const APPLE_WALLET_CONFIG = {
  teamId: process.env.APPLE_TEAM_ID || '8QYMJ4RJ55',
  passTypeId: process.env.APPLE_PASS_TYPE_ID || 'pass.com.fidelyz.apple.passkit',
  // Using cleaned PEM files without OpenSSL attributes
  certPath: './certs/certificate-clean.pem',
  keyPath: './certs/key-clean.pem',
  // For unencrypted keys (most common): use empty string
  // For encrypted keys: use the passphrase
  certPassword: process.env.APPLE_CERT_PASSWORD || '',
  modelPath: path.resolve(path.dirname(__dirname), 'models', 'fidelyz.pass')
};

/**
 * Valide la configuration Apple Wallet
 * @throws {Error} Si configuration invalide
 */
const validateConfig = () => {
  // Vérifier Team ID
  if (!APPLE_WALLET_CONFIG.teamId) {
    throw new Error('APPLE_TEAM_ID manquant dans les variables d\'environnement');
  }

  // Vérifier Pass Type ID
  if (!APPLE_WALLET_CONFIG.passTypeId) {
    throw new Error('APPLE_PASS_TYPE_ID manquant dans les variables d\'environnement');
  }

  // Vérifier l'existence du certificat
  if (!fs.existsSync(APPLE_WALLET_CONFIG.certPath)) {
    throw new Error(
      `Certificat Apple Wallet non trouvé à : ${APPLE_WALLET_CONFIG.certPath}\n` +
      'Assurez-vous que certificat_final.p12 est placé dans backend/certs/ en tant que apple-wallet-cert.p12'
    );
  }

  // Vérifier l'existence du modèle de pass
  if (!fs.existsSync(APPLE_WALLET_CONFIG.modelPath)) {
    throw new Error(
      `Modèle de pass non trouvé à : ${APPLE_WALLET_CONFIG.modelPath}`
    );
  }

  logger.info('✅ Configuration Apple Wallet validée', {
    teamId: APPLE_WALLET_CONFIG.teamId,
    passTypeId: APPLE_WALLET_CONFIG.passTypeId,
    modelPath: APPLE_WALLET_CONFIG.modelPath
  });
};

/**
 * Charge les fichiers de certificat et de clé privée
 * 
 * When extracting from .p12/PKCS#12:
 * - `certificate.pem`: Contains just the certificate (no password needed)
 * - `private-key.pem`: Contains the private key (may or may not be encrypted)
 * 
 * For unencrypted keys (most common): signerKeyPassphrase should be '' or undefined
 * For encrypted keys: signerKeyPassphrase should be the actual passphrase
 * 
 * @returns {Object} Object with signingCert (Buffer) and key (Buffer)
 */
const loadCertificate = () => {
  try {
    const certBuffer = fs.readFileSync(APPLE_WALLET_CONFIG.certPath);
    const keyBuffer = fs.readFileSync(APPLE_WALLET_CONFIG.keyPath);
    
    logger.debug('✅ Certificat chargé avec succès', {
      certPath: APPLE_WALLET_CONFIG.certPath,
      certSize: certBuffer.length + ' bytes',
      keySize: keyBuffer.length + ' bytes'
    });
    
    return {
      signingCert: certBuffer,
      key: keyBuffer  // ← This is used as signerKey in certificates object
    };
  } catch (error) {
    throw new Error(
      `Impossible de charger le certificat ou la clé : ${error.message}`
    );
  }
};

/**
 * Crée un pass Apple Wallet personnalisé
 * 
 * @param {Object} clientData - Données du client
 * @param {string} clientData.id - ID unique du client
 * @param {string} clientData.firstName - Prénom
 * @param {string} clientData.lastName - Nom
 * @param {string} clientData.email - Email
 * @param {number} clientData.points - Points de fidélité
 * @param {string} clientData.cardNumber - Numéro de carte (optionnel)
 * 
 * @returns {Promise<Buffer>} Buffer prêt à être envoyé comme fichier .pkpass
 * 
 * @throws {Error} Si génération échoue
 * 
 * @example
 * const passBuffer = await generateAppleWalletPass({
 *   id: 'client-123',
 *   firstName: 'Jean',
 *   lastName: 'Dupont',
 *   email: 'jean@example.com',
 *   points: 150,
 *   cardNumber: 'FIDELYZ-001'
 * });
 */
export const generateAppleWalletPass = async (clientData) => {
  try {
    // Validation initiale
    if (!clientData || !clientData.id) {
      throw new Error('Client ID manquant ou données invalides');
    }

    // Valider la configuration
    validateConfig();

    logger.info('🔄 Génération d\'Apple Wallet pass...', { clientId: clientData.id });

    // Charger le certificat et la clé privée
    const certs = loadCertificate();

    // Créer une nouvelle instance PKPass avec le modèle
    // ⚠️ CORRECT STRUCTURE FOR passkit-generator v3.3.0:
    // - signingCert: the certificate buffer
    // - signerKey: the private key buffer (REQUIRED - was missing before!)
    // - signerKeyPassphrase: passphrase if key is encrypted, else undefined (not empty string)
    const pass = new PKPass(
      {
        model: APPLE_WALLET_CONFIG.modelPath,
        certificates: {
          signingCert: certs.signingCert,
          signerKey: certs.key,  // ✅ ADD THE PRIVATE KEY HERE
          signerKeyPassphrase: APPLE_WALLET_CONFIG.certPassword || undefined  // Use undefined instead of empty string
        }
      }
    );

    // DÉFINIR LE TYPE DE PASS (propriété, pas méthode !)
    pass.type = 'storeCard';
    logger.debug('🎫 Type de pass défini', { type: 'storeCard' });

    // PERSONNALISATION 1️⃣ : Numéro de série unique
    pass.serialNumber = clientData.cardNumber || clientData.id;
    logger.debug('📝 Numéro de série défini', { serialNumber: pass.serialNumber });

    // PERSONNALISATION 2️⃣ : Code QR avec ID client (utiliser setBarcodes)
    try {
      pass.setBarcodes(clientData.id, 'PKBarcodeFormatQR', 'iso-8859-1');
      logger.debug('📱 Code QR défini', { clientId: clientData.id });
    } catch (barcodeError) {
      logger.warn('⚠️ Erreur définition QR, tentative alternative...', { error: barcodeError.message });
      // Alternative : actualiser le barcode dans le JSON directement
      if (pass.json && pass.json.barcodes && pass.json.barcodes.length > 0) {
        pass.json.barcodes[0] = {
          format: 'PKBarcodeFormatQR',
          message: clientData.id,
          messageEncoding: 'iso-8859-1',
          altText: String(clientData.id)
        };
      }
    }

    // PERSONNALISATION 3️⃣ : Données du client
    const fullName = `${clientData.firstName || 'Client'} ${clientData.lastName || ''}`.trim();
    const displayPoints = String(clientData.points || 0);
    const displayEmail = clientData.email || 'contact@fidelyz.com';

    // Mettre à jour les champs du pass (utiliser les getters d'arrays)
    pass.primaryFields.push({
      key: 'points',
      label: 'Vos Points',
      value: displayPoints,
      textAlignment: 'PKTextAlignmentCenter'
    });

    pass.secondaryFields.push({
      key: 'name',
      label: 'Nom',
      value: fullName
    });

    pass.backFields.push({
      key: 'email',
      label: 'Contact',
      value: displayEmail
    });

    pass.backFields.push({
      key: 'terms',
      label: 'Conditions',
      value: 'Bienvenue chez Fidelyz. Accumulez des points à chaque achat et profitez de récompenses exclusives!'
    });

    logger.debug('✏️ Données du pass personnalisées', {
      fullName,
      points: displayPoints,
      email: displayEmail
    });

    // GÉNÉRATION : Créer le buffer du pass
    const passBuffer = await pass.getAsBuffer();

    logger.info('✅ Apple Wallet pass généré avec succès', {
      clientId: clientData.id,
      bufferSize: passBuffer.length + ' bytes',
      filename: `fidelyz-${clientData.id}.pkpass`
    });

    return passBuffer;

  } catch (error) {
    logger.error('❌ Erreur génération Apple Wallet pass', {
      clientId: clientData?.id || 'unknown',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Effectue les vérifications de diagnostic pour Apple Wallet
 * @returns {Promise<Object>} Diagnostic détaillé
 */
export const diagnoseAppleWallet = async () => {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    config: {},
    files: {},
    status: 'ERROR'
  };

  try {
    // Vérifier configuration env
    diagnosis.config = {
      teamId: APPLE_WALLET_CONFIG.teamId || '❌ MANQUANT',
      passTypeId: APPLE_WALLET_CONFIG.passTypeId || '❌ MANQUANT',
      certPath: APPLE_WALLET_CONFIG.certPath,
      certExists: fs.existsSync(APPLE_WALLET_CONFIG.certPath),
      modelPath: APPLE_WALLET_CONFIG.modelPath,
      modelExists: fs.existsSync(APPLE_WALLET_CONFIG.modelPath)
    };

    // Vérifier fichiers
    if (fs.existsSync(APPLE_WALLET_CONFIG.certPath)) {
      const certStats = fs.statSync(APPLE_WALLET_CONFIG.certPath);
      diagnosis.files.certificate = {
        path: APPLE_WALLET_CONFIG.certPath,
        size: certStats.size + ' bytes',
        accessible: true
      };
    } else {
      diagnosis.files.certificate = {
        path: APPLE_WALLET_CONFIG.certPath,
        accessible: false,
        error: 'Fichier non trouvé'
      };
    }

    if (fs.existsSync(APPLE_WALLET_CONFIG.modelPath)) {
      const modelFiles = fs.readdirSync(APPLE_WALLET_CONFIG.modelPath);
      diagnosis.files.model = {
        path: APPLE_WALLET_CONFIG.modelPath,
        files: modelFiles,
        hasPassJson: modelFiles.includes('pass.json')
      };
    } else {
      diagnosis.files.model = {
        path: APPLE_WALLET_CONFIG.modelPath,
        error: 'Répertoire modèle non trouvé'
      };
    }

    // Déterminer le statut général
    const allOk = 
      diagnosis.config.certExists && 
      diagnosis.config.modelExists &&
      diagnosis.files.certificate?.accessible &&
      diagnosis.files.model?.hasPassJson;

    diagnosis.status = allOk ? 'OK' : 'ERROR';

    logger.info('🔍 Diagnostic Apple Wallet', diagnosis);
    return diagnosis;

  } catch (error) {
    diagnosis.error = error.message;
    diagnosis.status = 'ERROR';
    logger.error('❌ Erreur lors du diagnostic', diagnosis);
    return diagnosis;
  }
};

export default {
  generateAppleWalletPass,
  diagnoseAppleWallet,
  APPLE_WALLET_CONFIG
};
