/**
 * AppleWebserviceController.js
 * API Web Service standardisée requise par Apple Wallet
 *
 * Apple Wallet effectue automatiquement des requêtes à ces endpoints:
 * - POST /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber
 * - GET /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier?passesUpdatedSince=tag
 * - GET /v1/passes/:passTypeIdentifier/:serialNumber
 * - DELETE /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber
 * - POST /v1/log
 */

import db from '../db.js';
import passGenerator from '../utils/passGenerator.js';
import logger from '../utils/logger.js';

/**
 * MIDDLEWARE: Vérifier le token d'authentification
 * Apple envoie le header: Authorization: ApplePass <authenticationToken>
 */
export const authenticateApplePass = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('ApplePass ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring('ApplePass '.length);
    const { serialNumber } = req.params;

    if (!serialNumber) {
      return res.status(400).json({ error: 'Missing serialNumber' });
    }

    // Vérifier que le token correspond au serial number
    const [tokenRows] = await db.query(
      'SELECT id, client_id FROM wallet_cards WHERE pass_serial_number = ? AND authentication_token = ?',
      [serialNumber, token]
    );

    if (!tokenRows || tokenRows.length === 0) {
      logger.warn(`⚠️ Authentification échouée: serial=${serialNumber}, token=${token.substring(0, 20)}...`);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Attacher au request pour les modules suivants
    req.authPass = tokenRows[0];
    req.authPass.serialNumber = serialNumber;
    next();
  } catch (error) {
    logger.error(`❌ Erreur authentification: ${error.message}`);
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * 1️⃣ ENREGISTRER UN APPAREIL (POST)
 * Route: POST /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber
 *
 * Apple Wallet appelle cette route quand un client ajoute le pass à son Wallet
 * Body: { "pushToken": "..." }
 * Response: 201 (Created) ou 200 (OK)
 */
export const registerDevice = async (req, res) => {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;
    const { pushToken } = req.body;

    // 1. Vérification du PassTypeID
    if (passTypeIdentifier !== process.env.APPLE_PASS_TYPE_ID) {
      logger.warn(`⚠️ Tentative d'enregistrement pour un PassTypeID incorrect: ${passTypeIdentifier}`);
      return res.status(404).json({ error: 'Incorrect pass type' });
    }

    // 2. Vérification de l'authentification (ApplePass <token>)
    const authHeader = req.headers.authorization;
    let authToken = null;
    if (!authHeader || !authHeader.startsWith('ApplePass ')) {
      logger.warn(`⚠️ ALERTE: En-tête Authorization manquant ou invalide! (Peut-être supprimé par Nginx/Apache). On laisse passer temporairement pour débugger l'enregistrement.`);
    } else {
      authToken = authHeader.split(' ')[1];
    }

    if (!deviceLibraryIdentifier || !serialNumber || !pushToken) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    logger.info(
      `📱 Tentative d'enregistrement device: serial=${serialNumber}, device=${deviceLibraryIdentifier.substring(0, 10)}...`
    );

    // 3. Vérifier que le pass existe ET que le token correspond
    const [passRows] = await db.query(
      'SELECT id, authentication_token FROM wallet_cards WHERE pass_serial_number = ?',
      [serialNumber]
    );

    if (!passRows || passRows.length === 0) {
      logger.warn(`⚠️ Enregistrement refusé: Pass ${serialNumber} inconnu en BD`);
      return res.status(404).json({ error: 'Pass not found' });
    }

    if (authToken && passRows[0].authentication_token !== authToken) {
      logger.warn(`🔒 Token invalide pour le pass ${serialNumber}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 4. Insérer ou mettre à jour l'enregistrement du device
    await db.query(
      `INSERT INTO apple_pass_registrations (
        pass_serial_number, device_library_identifier, push_token, pass_type_identifier
      ) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        push_token = VALUES(push_token),
        pass_type_identifier = VALUES(pass_type_identifier)`,
      [serialNumber, deviceLibraryIdentifier, pushToken, passTypeIdentifier]
    );

    logger.info(`✅ Appareil enregistré avec succès pour le pass ${serialNumber}`);
    res.status(201).json({ status: 'success' });
  } catch (error) {
    logger.error(`❌ Erreur enregistrement device: ${error.message}`);
    res.status(500).json({ error: 'Device registration error' });
  }
};

/**
 * 2️⃣ GETS PASSES MIS À JOUR (GET)
 * Route: GET /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier?passesUpdatedSince=tag
 *
 * Apple Wallet appelle cette route régulièrement pour savoir quels passes ont changé
 * Response: 204 (rien de nouveau) ou 200 { serialNumbers: [...], lastUpdated: "tag" }
 */
export const getUpdatedPasses = async (req, res) => {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier } = req.params;
    const { passesUpdatedSince } = req.query;

    if (!deviceLibraryIdentifier || !passTypeIdentifier) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    logger.info(
      `🔍 Vérification passes mis à jour: device=${deviceLibraryIdentifier.substring(0, 20)}..., since=${passesUpdatedSince || 'null'}`
    );

    // Récupérer les passes enregistrés sur ce device avec leur date de dernière mise à jour de données
    const [registrations] = await db.query(
      `SELECT DISTINCT apr.pass_serial_number, wc.last_updated
       FROM apple_pass_registrations apr
       JOIN wallet_cards wc ON apr.pass_serial_number = wc.pass_serial_number
       WHERE apr.device_library_identifier = ?`,
      [deviceLibraryIdentifier]
    );

    if (!registrations || registrations.length === 0) {
      logger.info(`ℹ️ Aucun pass pour ce device`);
      return res.status(204).send();
    }

    // Filtrer par date si fournie
    let updatedPasses = registrations;
    if (passesUpdatedSince) {
      // On utilise >= pour s'assurer que si une mise à jour a eu lieu à l'instant même du tag, elle est incluse.
      // Apple attend les changements DEPUIS (since) le tag.
      const sinceDate = new Date(parseInt(passesUpdatedSince));
      updatedPasses = registrations.filter(
        (p) => new Date(p.last_updated) >= sinceDate
      );
    }

    // Si rien de nouveau, retourner 204
    if (updatedPasses.length === 0) {
      logger.info(`✅ Aucun pass mis à jour depuis ${passesUpdatedSince}`);
      return res.status(204).send();
    }

    // Retourner la liste des passes mis à jour
    const serialNumbers = updatedPasses.map((p) => p.pass_serial_number);
    // Utiliser la valeur brute pour garder la précision
    const lastUpdatedTag = Math.max(...updatedPasses.map((p) => new Date(p.last_updated).getTime())).toString();

    logger.info(`✅ ${serialNumbers.length} pass(es) mis à jour`);
    res.json({
      serialNumbers,
      lastUpdated: lastUpdatedTag,
    });
  } catch (error) {
    logger.error(`❌ Erreur vérification mises à jour: ${error.message}`);
    res.status(500).json({ error: 'Check updates error' });
  }
};

/**
 * 3️⃣ DISTRIBUER LE NOUVEAU PASS (GET)
 * Route: GET /v1/passes/:passTypeIdentifier/:serialNumber
 *
 * Apple Wallet appelle cette route pour télécharger le fichier .pkpass mis à jour
 * Authentification requise via header Authorization: ApplePass <token>
 * Response: Buffer .pkpass avec headers appropriés
 */
export const getUpdatedPass = async (req, res) => {
  try {
    const { passTypeIdentifier, serialNumber } = req.params;

    if (!serialNumber) {
      return res.status(400).json({ error: 'Missing serialNumber' });
    }

    // 1. Vérification du PassTypeID
    if (passTypeIdentifier !== process.env.APPLE_PASS_TYPE_ID) {
      return res.status(404).json({ error: 'Incorrect pass type' });
    }

    // 2. Authentification très stricte
    const authHeader = req.headers.authorization;
    let authToken = null;
    if (!authHeader || !authHeader.startsWith('ApplePass ')) {
      logger.warn(`⚠️ ALERTE (getUpdatedPass): En-tête Authorization manquant. Bypass temporaire pour debug !`);
    } else {
      authToken = authHeader.split(' ')[1];
    }

    logger.info(`📦 Requête pass mis à jour: ${serialNumber}`);

    // 3. Récupérer les données avec vérification du token
    const [clientRows] = await db.query(
      `SELECT c.id, c.prenom, c.nom, c.telephone, c.points, c.created_at,
              wc.pass_serial_number, wc.authentication_token, wc.points_balance,
              e.id as company_id, e.nom as company_name, e.loyalty_type,
              cc.logo_url as generic_logo, cc.icon_url as generic_icon, cc.strip_image_url as generic_strip,
              cc.primary_color as generic_color, cc.text_color as generic_text, cc.accent_color as generic_label,
              cc.apple_logo_url, cc.apple_icon_url, cc.apple_strip_image_url,
              cc.apple_background_color, cc.apple_text_color, cc.apple_label_color,
              cc.apple_pass_description, cc.apple_organization_name,
              cc.back_fields_info, cc.back_fields_terms, cc.back_fields_website,
              cc.back_fields_phone, cc.back_fields_address, cc.back_fields_instagram,
              cc.back_fields_facebook, cc.back_fields_tiktok
       FROM wallet_cards wc
       JOIN clients c ON wc.client_id = c.id
       JOIN entreprises e ON c.entreprise_id = e.id
       LEFT JOIN card_customization cc ON e.id = cc.company_id
       WHERE wc.pass_serial_number = ?
       ORDER BY cc.updated_at DESC
       LIMIT 1`,
      [serialNumber]
    );

    if (!clientRows || clientRows.length === 0) {
      logger.warn(`⚠️ Pass ${serialNumber} introuvable en base.`);
      return res.status(404).json({ error: 'Pass not found' });
    }

    const data = clientRows[0];
    
    // LOGIQUE DE SECOURS (FALLBACK) : Si Apple est vide, on prend le générique
    const finalDesign = {
      apple_background_color: data.apple_background_color || data.generic_color || '#1f2937',
      apple_label_color: data.apple_label_color || data.generic_label || '#a8a8a8',
      apple_text_color: data.apple_text_color || data.generic_text || '#ffffff',
      apple_logo_url: data.apple_logo_url || data.generic_logo,
      apple_icon_url: data.apple_icon_url || data.generic_icon,
      apple_strip_image_url: data.apple_strip_image_url || data.generic_strip,
      apple_pass_description: data.apple_pass_description,
      apple_organization_name: data.apple_organization_name
    };

    logger.info(`🎨 --- DIAGNOSTIC DESIGN (AVEC FALLBACKS) POUR ${data.company_name} ---`);
    logger.info(`   > Couleur Fond : ${finalDesign.apple_background_color}`);
    logger.info(`   > Logo URL : ${finalDesign.apple_logo_url || 'AUCUN'}`);
    logger.info(`🎨 -----------------------------------------------------------`);
    const loyaltyType = data.loyalty_type || 'points';

    // Récupérer les paliers de récompense
    const [tiers] = await db.query(
      'SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC',
      [data.company_id]
    );

    // Calculer les points gagnés (différence entre le solde actuel et le dernier envoyé au pass)
    const currentPoints = Number(data.points) || 0;
    const lastPointsInPass = Number(data.points_balance) || 0;
    const pointsGained = currentPoints - lastPointsInPass;

    // Vérification stricte du token de sécurité Apple
    if (data.authentication_token !== authToken) {
      logger.warn(`🔒 Token invalide lors de la récupération du pass ${serialNumber}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2️⃣ Préparer les données pour la génération
    const passData = {
      clientId: data.id,
      firstName: data.prenom,
      lastName: data.nom,
      phoneNumber: data.telephone,
      companyName: data.company_name,
      loyaltyType: loyaltyType,
      balance: currentPoints, // Envoyer le solde réel actuel
      rewardTiers: tiers,
      pointsGained: pointsGained > 0 ? pointsGained : 0,
      createdAt: data.created_at,
      qrCodeValue: data.id.toString(),
    };

    const customization = {
      apple_logo_url: data.apple_logo_url,
      apple_icon_url: data.apple_icon_url,
      apple_background_color: data.apple_background_color,
      apple_text_color: data.apple_text_color,
      apple_label_color: data.apple_label_color,
      apple_pass_description: data.apple_pass_description,
      apple_organization_name: data.apple_organization_name,
      back_fields_info: data.back_fields_info,
      back_fields_terms: data.back_fields_terms,
      back_fields_website: data.back_fields_website,
      back_fields_phone: data.back_fields_phone,
      back_fields_address: data.back_fields_address,
      back_fields_instagram: data.back_fields_instagram,
      back_fields_facebook: data.back_fields_facebook,
      back_fields_tiktok: data.back_fields_tiktok,
    };

    // 3️⃣ Générer le nouveau pass (utilise l'instance globale importée)
    // passGenerator est l'instance par défaut importée en haut du fichier
    
    
    // Forcer HTTPS obligatoirement pour Apple Wallet (exigence stricte)
    let backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    if (backendUrl.startsWith('http://')) {
      backendUrl = backendUrl.replace('http://', 'https://');
    }
    const webServiceURL = `${backendUrl}/api/wallet`;
    
    logger.info(`🌐 WebServiceURL pour ce pass : ${webServiceURL}`);

    const passBuffer = await passGenerator.generateLoyaltyPass(
      passData,
      finalDesign, // Utilise les réglages (Apple ou Génériques)
      serialNumber,
      data.authentication_token,
      { webServiceURL }
    );

    if (!passBuffer) {
      logger.warn('⚠️ Aucun pass généré (possiblement désactivé).');
      return res.status(503).json({ error: 'Service temporairement indisponible (Génération Pass)' });
    }

    // 4️⃣ Mettre à jour la date de génération et le SOLDE synchronisé (Précision ms)
    await db.query(
      'UPDATE wallet_cards SET points_balance = ?, last_updated = NOW(3) WHERE pass_serial_number = ?',
      [currentPoints, serialNumber]
    );

    // 5️⃣ Envoyer le fichier
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    // Utiliser la date réelle de mise à jour de la carte en BD
    const lastModified = data.last_updated ? new Date(data.last_updated) : new Date();
    res.setHeader('Last-Modified', lastModified.toUTCString());
    res.setHeader('Content-Length', passBuffer.length);
    res.send(passBuffer);

    logger.info(`✅ Pass délivré (${passBuffer.length} bytes)`);
  } catch (error) {
    logger.error(`❌ Erreur livraison pass: ${error.message}`);
    res.status(500).json({ error: 'Pass delivery error' });
  }
};

/**
 * 4️⃣ DÉSINSCRIRE UN APPAREIL (DELETE)
 * Route: DELETE /v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber
 *
 * Apple Wallet appelle cette route quand le client supprime le pass de son Wallet
 * Response: 200
 */
export const unregisterDevice = async (req, res) => {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;

    // 1. Vérification du PassTypeID
    if (passTypeIdentifier !== process.env.APPLE_PASS_TYPE_ID) {
      return res.status(404).json({ error: 'Incorrect pass type' });
    }

    // 2. Vérification de l'authentification (ApplePass <token>)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('ApplePass ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const authToken = authHeader.split(' ')[1];

    if (!deviceLibraryIdentifier || !serialNumber) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // 3. Vérifier que le pass existe ET que le token correspond
    const [passRows] = await db.query(
      'SELECT authentication_token FROM wallet_cards WHERE pass_serial_number = ?',
      [serialNumber]
    );

    if (passRows && passRows.length > 0 && passRows[0].authentication_token !== authToken) {
      logger.warn(`🔒 Token invalide lors de la désinscription du pass ${serialNumber}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    logger.info(
      `🗑️ Désenregistrement device: serial=${serialNumber}, device=${deviceLibraryIdentifier.substring(0, 20)}...`
    );

    // 4. Supprimer l'enregistrement
    const [result] = await db.query(
      'DELETE FROM apple_pass_registrations WHERE pass_serial_number = ? AND device_library_identifier = ?',
      [serialNumber, deviceLibraryIdentifier]
    );

    if (result.affectedRows === 0) {
      logger.warn(`⚠️ Enregistrement non trouvé`);
      return res.status(404).json({ error: 'Registration not found' });
    }

    logger.info(`✅ Device désenregistré`);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(`❌ Erreur désenregistrement: ${error.message}`);
    res.status(500).json({ error: 'Unregistration error' });
  }
};

/**
 * 5️⃣ LOGS APPLE (POST)
 * Route: POST /v1/log
 *
 * Apple Wallet envoie des logs pour le debug
 * Body: { logs: ["erreur 1", "erreur 2", ...] }
 * Response: 200
 */
export const logAppleWalletErrors = async (req, res) => {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ error: 'logs array required' });
    }

    // Enregistrer les logs
    logs.forEach((log) => {
      logger.warn(`🍎 [APPLE WALLET DEVICE LOG]: ${log}`);
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(`❌ Erreur traitement logs: ${error.message}`);
    res.status(500).json({ error: 'Log processing error' });
  }
};

export default {
  authenticateApplePass,
  registerDevice,
  getUpdatedPasses,
  getUpdatedPass,
  unregisterDevice,
  logAppleWalletErrors,
};
