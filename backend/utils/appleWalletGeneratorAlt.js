/**
 * Apple Wallet Pass Generator - Alternative Implementation
 * Using @walletpass/pass-js instead of passkit-generator
 * 
 * This module provides a clean alternative to generate Apple Wallet passes
 * when passkit-generator has issues with certificate handling
 */

import { Template } from '@walletpass/pass-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import forge from 'node-forge';  // Import node-forge directly
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Apple Wallet configuration
 */
const APPLE_CONFIG = {
  teamId: process.env.APPLE_TEAM_ID || '8QYMJ4RJ55',
  passTypeId: process.env.APPLE_PASS_TYPE_ID || 'pass.com.fidelyz.apple.passkit',
  p12Path: process.env.APPLE_CERT_PATH || './certs/apple-wallet-cert.p12',
  p12Password: process.env.APPLE_CERT_PASSWORD || '', // Empty password
  modelPath: path.resolve(path.dirname(__dirname), 'models', 'fidelyz.pass'),
  iconPath: path.resolve(path.dirname(__dirname), 'models', 'fidelyz.pass', 'icon.png'),
  icon2xPath: path.resolve(path.dirname(__dirname), 'models', 'fidelyz.pass', 'icon@2x.png'),
  icon3xPath: path.resolve(path.dirname(__dirname), 'models', 'fidelyz.pass', 'icon@3x.png'),
  logoPath: path.resolve(path.dirname(__dirname), 'models', 'fidelyz.pass', 'logo.png')
};

/**
 * Extract certificate and private key from PKCS#12 file using node-forge
 */
const extractFromP12 = (p12Path, password) => {
  try {
    const p12Buffer = fs.readFileSync(p12Path);
    
    // Parse PKCS#12 using node-forge
    const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password || '');
    
    // Extract certificate and key
    let cert = null;
    let key = null;
    
    // DEBUG: Log all bags to understand P12 structure
    try {
      const allBags = p12.getBags({});
      logger.debug('[P12] All bag types found:', Object.keys(allBags));
      
      // Try all possible keys to find certificates
      for (const [bagType, bags] of Object.entries(allBags)) {
        logger.debug(`[P12] Bag type: ${bagType}`, { count: bags ? bags.length : 0 });
        
        if (bags && bags.length > 0) {
          for (const bag of bags) {
            if (bag.cert) {
              logger.debug(`[P12] Found cert in ${bagType}`);
              if (!cert) {
                cert = forge.pki.certificateToPem(bag.cert);
              }
            }
            if (bag.key) {
              logger.debug(`[P12] Found key in ${bagType}`);
              if (!key) {
                key = forge.pki.privateKeyToPem(bag.key);
              }
            }
          }
        }
      }
    } catch (debugError) {
      logger.warn('[P12] Error during debug:', { error: debugError.message });
    }
    
    // Fallback: Try direct password decryption
    if (!cert || !key) {
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag }).certBag || [];
      if (certBags.length > 0) {
        cert = forge.pki.certificateToPem(certBags[0].cert);
      }
      
      const keys = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag }).pkcs8ShroudedKeyBag || [];
      if (keys.length > 0) {
        key = forge.pki.privateKeyToPem(keys[0]);
      }
    }
    
    if (!cert || !key) {
      throw new Error(`Could not extract from P12 - cert: ${!!cert}, key: ${!!key}`);
    }
    
    logger.debug('✅ [P12] Certificate et clé extraites du P12', {
      certLength: cert.length,
      keyLength: key.length
    });
    
    return { cert, key };
    
  } catch (error) {
    logger.error('❌ [P12] Erreur d\'extraction du P12', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Generate Apple Wallet pass using @walletpass/pass-js
 * 
 * @param {Object} clientData - Customer data
 * @param {string} clientData.id - Unique client ID
 * @param {string} clientData.firstName - Client first name
 * @param {string} clientData.lastName - Client last name
 * @param {string} clientData.email - Client email
 * @param {number} clientData.points - Loyalty points
 * @param {string} clientData.cardNumber - Card number
 * @returns {Promise<Buffer>} The .pkpass file buffer
 */
export const generateAppleWalletPass = async (clientData) => {
  try {
    if (!clientData || !clientData.id) {
      throw new Error('Client ID manquant ou données invalides');
    }

    logger.info('🔄 [ALT] Génération d\'Apple Wallet pass...', { 
      clientId: clientData.id,
      library: '@walletpass/pass-js'
    });

    // Extract certificate and key from PKCS#12
    const { cert: certPem, key: keyPem } = extractFromP12(
      APPLE_CONFIG.p12Path,
      APPLE_CONFIG.p12Password
    );

    // Create template
    const template = new Template('storeCard', {
      passTypeIdentifier: APPLE_CONFIG.passTypeId,
      teamIdentifier: APPLE_CONFIG.teamId,
      organizationName: 'Fidelyz',
      description: 'Carte de Fidélité Fidelyz',
      logoText: 'FIDELYZ',
      backgroundColor: 'rgb(204, 51, 51)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(255, 255, 255)'
    });

    // Set certificate and private key
    template.setPrivateKey(keyPem, APPLE_CONFIG.keyPassword || undefined);
    template.setCertificate(certPem);

    logger.debug('🔐 [ALT] Certificats configurés', { 
      passTypeId: APPLE_CONFIG.passTypeId,
      teamId: APPLE_CONFIG.teamId
    });

    // Add images from model directory
    try {
      if (fs.existsSync(APPLE_CONFIG.iconPath)) {
        template.images.add('icon', fs.readFileSync(APPLE_CONFIG.iconPath));
        logger.debug('📱 [ALT] Icon ajoutée');
      }
      if (fs.existsSync(APPLE_CONFIG.icon2xPath)) {
        template.images.add('icon', fs.readFileSync(APPLE_CONFIG.icon2xPath), 'x2');
      }
      if (fs.existsSync(APPLE_CONFIG.icon3xPath)) {
        template.images.add('icon', fs.readFileSync(APPLE_CONFIG.icon3xPath), 'x3');
      }
      if (fs.existsSync(APPLE_CONFIG.logoPath)) {
        template.images.add('logo', fs.readFileSync(APPLE_CONFIG.logoPath));
        logger.debug('🎨 [ALT] Logo ajouté');
      }
    } catch (imgError) {
      logger.warn('⚠️ [ALT] Erreur lors du chargement des images', { error: imgError.message });
    }

    // Create individual pass
    const pass = template.createPass({
      serialNumber: clientData.cardNumber || clientData.id,
      description: `Loyalty Card - ${clientData.id}`
    });

    logger.debug('📝 [ALT] Pass créé', { serialNumber: pass.serialNumber });

    // Set barcode (QR code)
    pass.setBarcodes({
      format: 'PKBarcodeFormatQR',
      message: clientData.id,
      messageEncoding: 'iso-8859-1',
      altText: String(clientData.id)
    });

    logger.debug('📱 [ALT] Code QR défini', { clientId: clientData.id });

    // Prepare display data
    const fullName = `${clientData.firstName || 'Client'} ${clientData.lastName || ''}`.trim();
    const displayPoints = String(clientData.points || 0);
    const displayEmail = clientData.email || 'contact@fidelyz.com';

    // Add primary fields (displayed prominently)
    pass.primaryFields.add({
      key: 'points',
      label: 'Vos Points',
      value: displayPoints,
      textAlignment: 'PKTextAlignmentCenter'
    });

    // Add auxiliary fields (secondary display)
    pass.auxiliaryFields.add({
      key: 'name',
      label: 'Nom',
      value: fullName
    });

    // Add back fields (back of card)
    pass.backFields.add({
      key: 'email',
      label: 'Contact',
      value: displayEmail
    });

    pass.backFields.add({
      key: 'terms',
      label: 'Conditions',
      value: 'Bienvenue chez Fidelyz. Accumulez des points à chaque achat et profitez de récompenses exclusives!'
    });

    logger.debug('✏️ [ALT] Données du pass personnalisées', {
      fullName,
      points: displayPoints,
      email: displayEmail
    });

    // Generate the pass buffer
    const passBuffer = await pass.asBuffer();

    logger.info('✅ [ALT] Apple Wallet pass généré avec succès', {
      clientId: clientData.id,
      bufferSize: passBuffer.length + ' bytes',
      library: '@walletpass/pass-js'
    });

    return passBuffer;

  } catch (error) {
    logger.error('❌ [ALT] Erreur génération Apple Wallet pass', {
      clientId: clientData?.id,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Diagnostic function to test Apple Wallet pass generation
 */
export const diagnoseAppleWallet = async () => {
  logger.info('🔍 [ALT] Diagnostic Apple Wallet Pass Generator');
  
  try {
    // Check configuration
    logger.info('Configuration:', {
      teamId: APPLE_CONFIG.teamId,
      passTypeId: APPLE_CONFIG.passTypeId,
      modelPath: APPLE_CONFIG.modelPath
    });

    // Check files
    if (!fs.existsSync(APPLE_CONFIG.certPath)) {
      throw new Error(`Certificat non trouvé: ${APPLE_CONFIG.certPath}`);
    }
    if (!fs.existsSync(APPLE_CONFIG.keyPath)) {
      throw new Error(`Clé privée non trouvée: ${APPLE_CONFIG.keyPath}`);
    }

    logger.info('✅ Fichiers trouvés et valides');

    // Try generating a test pass
    const testBuffer = await generateAppleWalletPass({
      id: 'DIAGNOSTIC-TEST',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@fidelyz.com',
      points: 100,
      cardNumber: 'TEST-CARD-001'
    });

    logger.info('✅ Test pass généré avec succès!', {
      bufferSize: testBuffer.length + ' bytes'
    });

    return {
      success: true,
      message: 'Apple Wallet pass generation works!',
      bufferSize: testBuffer.length
    };

  } catch (error) {
    logger.error('❌ Diagnostic failed', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
};
