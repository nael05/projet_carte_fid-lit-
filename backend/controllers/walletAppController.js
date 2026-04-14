/**
 * WalletAppController.js
 * API utilisée par le Frontend pour créer des passes et gérer les points
 * Supporte Apple Wallet (.pkpass) et Google Wallet (Google Wallet API)
 */

import { randomUUID } from 'crypto';
import passGenerator from '../utils/passGenerator.js';
import googleWalletGenerator from '../utils/googleWalletGenerator.js';
import { apnService } from '../utils/apnService.js';
import { sendLoyaltyUpdateNotification } from '../utils/notificationService.js';
import db from '../db.js';
import logger from '../utils/logger.js';

/**
 * POST /api/app/wallet/create
 * Crée un nouveau pass Apple Wallet ou Google Wallet pour un client
 */
export const createWalletPass = async (req, res) => {
  try {
    const { clientId, type_wallet: bodyWalletType } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId manquant' });
    }

    // 1️⃣ Récupérer le client + entreprise + customization + loyalty_config
    const [clientRows] = await db.query(
      `SELECT c.id, c.prenom, c.nom, c.telephone, c.points, c.type_wallet,
              e.id as company_id, e.nom as company_name,
              lc.points_for_reward,
              cc.logo_url as generic_logo_url,
              cc.icon_url as generic_icon_url,
              cc.strip_image_url as generic_strip_image_url,
              cc.primary_color as generic_primary_color,
              cc.text_color as generic_text_color,
              cc.accent_color as generic_accent_color,
              cc.apple_logo_url,
              cc.apple_icon_url,
              cc.apple_strip_image_url,
              cc.apple_background_color,
              cc.apple_text_color,
              cc.apple_label_color,
              cc.card_subtitle as generic_card_subtitle,
              cc.apple_pass_description,
              cc.apple_organization_name,
              cc.logo_text,
              cc.google_primary_color,
              cc.google_text_color,
              cc.google_logo_url,
              cc.google_hero_image_url,
              cc.google_card_title,
              cc.google_card_subtitle,
              cc.latitude,
              cc.longitude,
              cc.relevant_text
       FROM clients c
       LEFT JOIN entreprises e ON c.entreprise_id = e.id
       LEFT JOIN loyalty_config lc ON e.id = lc.entreprise_id
       LEFT JOIN card_customization cc ON e.id = cc.company_id
       WHERE c.id = ?`,
      [clientId]
    );

    if (!clientRows || clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const client = clientRows[0];
    let type_wallet = bodyWalletType || client.type_wallet || 'apple';
    const { company_id, company_name, points, points_for_reward } = client;

    // Mettre à jour en base si le type a changé
    if (bodyWalletType && bodyWalletType !== client.type_wallet) {
      await db.query('UPDATE clients SET type_wallet = ? WHERE id = ?', [bodyWalletType, client.id]);
    }

    if (!company_id) {
      return res.status(400).json({ error: 'Client sans entreprise associée' });
    }

    logger.info(`📱 Création pass ${type_wallet === 'google' ? 'Google' : 'Apple'} Wallet pour client: ${clientId}`);

    // LOGIQUE GOOGLE WALLET
    if (type_wallet === 'google') {
      try {
        const [tiers] = await db.query('SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC', [company_id]);
        await googleWalletGenerator.createOrUpdateClass(company_id, client, company_name);
        const saveUrl = await googleWalletGenerator.createLoyaltyObject(client.id, company_id, `${client.prenom} ${client.nom}`, points || 0, client, tiers);

        // Sauvegarder/Mettre à jour la référence dans wallet_cards pour permettre les mises à jour ultérieures
        const googleSerial = `GOOGLE_${client.id}`;
        const [existing] = await db.query('SELECT id FROM wallet_cards WHERE client_id = ? AND pass_serial_number LIKE "GOOGLE_%"', [client.id]);
        
        if (existing.length === 0) {
          const googleToken = `GOOGLE_${randomUUID()}`;
          await db.query(
            `INSERT INTO wallet_cards (client_id, company_id, pass_serial_number, authentication_token, points_balance, qr_code_value)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               pass_serial_number = VALUES(pass_serial_number),
               authentication_token = VALUES(authentication_token),
               points_balance = VALUES(points_balance),
               last_updated = NOW()`,
            [client.id, company_id, googleSerial, googleToken, points || 0, client.id.toString()]
          );
        }

        return res.json({
          success: true,
          type: 'google',
          saveUrl: saveUrl
        });
      } catch (err) {
        logger.error('Erreur génération Google Wallet', err);
        return res.status(500).json({ error: 'Erreur génération Google Wallet', details: err.message });
      }
    }

    // LOGIQUE APPLE WALLET
    // 2️⃣ Vérifier si le client a déjà une carte
    const [existingCards] = await db.query(
      'SELECT id FROM wallet_cards WHERE client_id = ? AND pass_serial_number NOT LIKE "GOOGLE_%"',
      [client.id]
    );

    if (existingCards.length > 0) {
      return res.status(400).json({
        error: 'Ce client possède déjà une carte Apple Wallet',
        serialNumber: existingCards[0].pass_serial_number,
      });
    }

    // 3️⃣ Utiliser l'id client comme serial number pour la cohérence
    const serialNumber = client.id.replace(/-/g, '').substring(0, 20).toUpperCase();
    const authenticationToken = randomUUID();

    // 4️⃣ Préparer données pour la génération du pass
    const [tiers] = await db.query(
      'SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC',
      [company_id]
    );

    const passData = {
      clientId: client.id,
      firstName: client.prenom,
      lastName: client.nom,
      phoneNumber: client.telephone,
      companyName: company_name,
      balance: points || 0,
      rewardTiers: tiers,
      createdAt: client.created_at || new Date(),
      qrCodeValue: client.id.toString(),
    };

    const customization = {
      apple_logo_url: client.apple_logo_url || client.generic_logo_url,
      apple_icon_url: client.apple_icon_url || client.generic_icon_url,
      apple_strip_image_url: client.apple_strip_image_url || client.generic_strip_image_url,
      apple_background_color: client.apple_background_color || client.generic_primary_color || '#1f2937',
      apple_text_color: client.apple_text_color || client.generic_text_color || '#ffffff',
      apple_label_color: client.apple_label_color || client.generic_accent_color || '#a8a8a8',
      apple_pass_description: client.apple_pass_description || client.generic_card_subtitle || 'Votre Carte de Fidélité',
      apple_organization_name: client.apple_organization_name || company_name,
      logo_text: client.logo_text,
      latitude: client.latitude,
      longitude: client.longitude,
      relevant_text: client.relevant_text,
    };
    // 5️⃣ Générer le pass Apple Wallet
    
    // Forcer l'URL de production pour Apple Wallet
    // CRITIQUE : Si le serveur tourne derrière un proxy/IP, req.get('host') peut renvoyer 'localhost'
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const webServiceURL = `${backendUrl}/api/wallet`;
    
    logger.info(`🌐 WebServiceURL pour ce pass : ${webServiceURL}`);
    
    const passBuffer = await passGenerator.generateLoyaltyPass(
      passData,
      customization,
      serialNumber,
      authenticationToken,
      { webServiceURL }
    );

    if (!passBuffer) {
      return res.status(503).json({ error: 'Service Apple Wallet temporairement désactivé (certificat manquant)' });
    }

    // 6️⃣ Sauvegarder en BD
    await db.query(
      `INSERT INTO wallet_cards (
        client_id, company_id, pass_serial_number, authentication_token,
        points_balance, qr_code_value
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        pass_serial_number = VALUES(pass_serial_number),
        points_balance = VALUES(points_balance),
        last_updated = NOW()`,
      [
        client.id,
        company_id,
        serialNumber,
        authenticationToken,
        points || 0,
        client.id.toString(),
      ]
    );

    // 7️⃣ Envoyer le fichier .pkpass
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="${serialNumber}.pkpass"`);
    res.setHeader('Content-Length', passBuffer.length);
    res.send(passBuffer);

  } catch (error) {
    logger.error(`❌ Erreur création pass: ${error.message}`);
    res.status(500).json({ error: 'Erreur création pass', details: error.message });
  }
};

/**
 * POST /api/app/wallet/add-points
 */
export const addPointsToWallet = async (req, res) => {
  try {
    const { clientId, pointsToAdd, reason } = req.body;

    if (!clientId || !pointsToAdd) {
      return res.status(400).json({ error: 'clientId et pointsToAdd requis' });
    }

    logger.info(`➕ Ajout de ${pointsToAdd} point(s) au client ${clientId}`);

    const [walletRows] = await db.query(
      `SELECT wc.id, wc.pass_serial_number, wc.points_balance, wc.stamps_balance,
              c.entreprise_id, e.loyalty_type
       FROM wallet_cards wc
       JOIN clients c ON wc.client_id = c.id
       JOIN entreprises e ON c.entreprise_id = e.id
       WHERE wc.client_id = ? OR wc.pass_serial_number = ?`,
      [clientId, clientId]
    );

    if (!walletRows || walletRows.length === 0) {
      return res.status(404).json({ error: 'Pas de carte Wallet pour ce client' });
    }

    const wallet = walletRows[0];
    const { id: walletId, pass_serial_number, loyalty_type } = wallet;

    const isStamps = loyalty_type === 'stamps';
    const oldBalance = isStamps ? wallet.stamps_balance : wallet.points_balance;
    const newBalance = oldBalance + pointsToAdd;

    await db.query(`UPDATE wallet_cards SET ${isStamps ? 'stamps_balance' : 'points_balance'} = ?, last_updated = NOW() WHERE id = ?`, [newBalance, walletId]);

    await db.query(
      `INSERT INTO pass_update_logs (
        wallet_card_id, pass_serial_number, action, value, old_balance, new_balance,
        description, triggered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [walletId, pass_serial_number, isStamps ? 'add_stamps' : 'add_points', pointsToAdd, oldBalance, newBalance, reason || 'API update', 'admin_api']
    );

    const [registrations] = await db.query(
      'SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?',
      [pass_serial_number]
    );

    const [rewardTiers] = await db.query(
      'SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC',
      [wallet.entreprise_id]
    );

    const textModulesData = [];
    if (Array.isArray(rewardTiers) && rewardTiers.length > 0) {
       const tiersList = rewardTiers.map(t => `- ${t.points_required} pts : ${t.title}`).join('\\n');
       textModulesData.push({
          header: 'Vos Paliers de Récompenses',
          body: tiersList,
          id: 'rewards_module'
       });
    }

    let notificationsSent = 0;
    if (registrations && registrations.length > 0) {
      const pushTokens = registrations.map((r) => r.push_token);
      const notificationResults = await apnService.sendBulkUpdateNotifications(pushTokens);
      notificationsSent = notificationResults.sent;
    }

    // MISE À JOUR GOOGLE WALLET
    if (pass_serial_number.startsWith('GOOGLE_')) {
      try {
        await googleWalletGenerator.updateLoyaltyPoints(clientId, newBalance, loyalty_type);
        logger.info(`✅ Points Google Wallet synchronisés pour client ${clientId}`);
      } catch (err) {
        logger.error(`❌ Échec synchro Google Wallet pour client ${clientId}: ${err.message}`);
      }
    }

    // Envoi notification Visuelle
    try {
      await sendLoyaltyUpdateNotification(clientId, wallet.entreprise_id, pointsToAdd, false);
    } catch (pushErr) {
      logger.warn('Push loyalty notification failed in walletApp', pushErr.message);
    }

    res.json({
      success: true,
      oldBalance,
      newBalance,
      notificationsSent,
      message: `${pointsToAdd} point(s) ajouté(s)`,
    });
  } catch (error) {
    logger.error(`❌ Erreur ajout points: ${error.message}`);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de points', details: error.message });
  }
};

/**
 * GET /api/app/wallet/status/:clientId
 */
export const getWalletStatus = async (req, res) => {
  try {
    const { clientId } = req.params;

    const [walletRows] = await db.query(
      `SELECT wc.id, wc.pass_serial_number, wc.points_balance, wc.stamps_balance, 
              wc.wallet_added_at, wc.last_updated,
              e.loyalty_type, COUNT(apr.id) as device_count
       FROM wallet_cards wc
       LEFT JOIN clients c ON wc.client_id = c.id
       LEFT JOIN entreprises e ON c.entreprise_id = e.id
       LEFT JOIN apple_pass_registrations apr ON wc.pass_serial_number = apr.pass_serial_number
       WHERE wc.client_id = ? OR wc.pass_serial_number = ?
       GROUP BY wc.id`,
      [clientId, clientId]
    );

    if (!walletRows || walletRows.length === 0) {
      return res.status(404).json({ error: 'Pas de carte Wallet' });
    }

    const wallet = walletRows[0];

    res.json({
      success: true,
      clientId,
      balance: wallet.loyalty_type === 'stamps' ? wallet.stamps_balance : wallet.points_balance,
      loyaltyType: wallet.loyalty_type,
      walletAddedAt: wallet.wallet_added_at,
      lastUpdated: wallet.last_updated,
      devicesRegistered: wallet.device_count,
      serialNumber: wallet.pass_serial_number,
    });
  } catch (error) {
    logger.error(`❌ Erreur statut: ${error.message}`);
    res.status(500).json({ error: 'Erreur récupération statut', details: error.message });
  }
};

/**
 * GET /api/app/wallet/client-download/:clientId
 */
export const downloadClientPass = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).send('Client ID manquant');
    }

    logger.info(`📱 Téléchargement (GET) pass pour client: ${clientId}`);

    const [clientRows] = await db.query(
      `SELECT c.id, c.prenom, c.nom, c.telephone, c.points, c.type_wallet,
               e.id as company_id, e.nom as company_name, e.loyalty_type,
               lc.points_for_reward, lc.stamps_for_reward,
               cc.logo_url as apple_logo_url,
               cc.icon_url as apple_icon_url,
               cc.strip_image_url as apple_strip_image_url,
               cc.primary_color as apple_background_color,
               cc.text_color as apple_text_color,
               cc.accent_color as apple_label_color,
               cc.card_subtitle as apple_pass_description,
               cc.apple_organization_name,
               cc.logo_text,
               cc.google_primary_color,
               cc.google_text_color,
               cc.google_logo_url,
               cc.google_hero_image_url,
               cc.google_card_title,
               cc.google_card_subtitle,
               cc.latitude,
               cc.longitude,
               cc.back_fields_info,
               cc.back_fields_terms,
               cc.back_fields_website,
               cc.back_fields_phone,
               cc.back_fields_address,
               cc.back_fields_instagram,
               cc.back_fields_facebook,
               cc.back_fields_tiktok
        FROM clients c
        LEFT JOIN entreprises e ON c.entreprise_id = e.id
        LEFT JOIN loyalty_config lc ON e.id = lc.entreprise_id
        LEFT JOIN card_customization cc ON e.id = cc.company_id
        WHERE c.id = ?`,
      [clientId]
    );

    if (!clientRows || clientRows.length === 0) {
      return res.status(404).send('Client non trouvé');
    }

    const client = clientRows[0];
    const requestedType = req.query.type; // ?type=apple ou ?type=google
    const userAgent = req.headers['user-agent'] || '';
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);

    // Déterminer le type final : soit forcé par l'URL, soit détecté par l'appareil, soit par défaut en DB
    let finalType = client.type_wallet;
    if (requestedType === 'apple' || requestedType === 'google') {
      finalType = requestedType;
    } else if (isIOS) {
      finalType = 'apple';
    }

    // SI GOOGLE WALLET -> Rediriger vers l'URL
    if (finalType === 'google') {
      try {
        const [tiers] = await db.query(
          'SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC',
          [client.company_id]
        );

        await googleWalletGenerator.createOrUpdateClass(client.company_id, client, client.company_name, 'points');
        const saveUrl = await googleWalletGenerator.createLoyaltyObject(client.id, client.company_id, `${client.prenom} ${client.nom}`, client.points || 0, client, tiers);
        
        // Assurer que la référence existe en base pour les mises à jour
        const [existing] = await db.query('SELECT id FROM wallet_cards WHERE client_id = ? AND pass_serial_number LIKE "GOOGLE_%"', [client.id]);
        if (existing.length === 0) {
          const googleToken = `GOOGLE_${randomUUID()}`;
          await db.query(
            `INSERT INTO wallet_cards (client_id, company_id, pass_serial_number, authentication_token, points_balance, stamps_balance, qr_code_value)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               pass_serial_number = VALUES(pass_serial_number),
               authentication_token = VALUES(authentication_token),
               points_balance = VALUES(points_balance),
               last_updated = NOW()`,
            [client.id, client.company_id, `GOOGLE_${client.id}`, googleToken, client.points || 0, 0, client.id.toString()]
          );
        }

        return res.redirect(saveUrl);
      } catch (err) {
        logger.error('Erreur redirection Google Wallet', err);
        return res.status(500).send('Erreur lors de la redirection Google Wallet.');
      }
    }

    // SI APPLE WALLET -> Générer .pkpass
    const serialNumber = client.id.replace(/-/g, '').substring(0, 20).toUpperCase();
    
    // Récupérer le token existant s'il y en a un pour ne pas casser la synchro APNs
    const [existingTokenRow] = await db.query('SELECT authentication_token FROM wallet_cards WHERE pass_serial_number = ?', [serialNumber]);
    const authenticationToken = existingTokenRow.length > 0 ? existingTokenRow[0].authentication_token : randomUUID();

    const [tiers] = await db.query(
      'SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC',
      [client.company_id]
    );

    const passData = {
      clientId: client.id,
      firstName: client.prenom,
      lastName: client.nom,
      phoneNumber: client.telephone,
      companyName: client.company_name,
      loyaltyType: 'points',
      balance: client.points || 0,
      rewardTiers: tiers,
      createdAt: new Date(),
      qrCodeValue: client.id.toString(),
    };

    const customization = {
      apple_logo_url: client.apple_logo_url,
      apple_icon_url: client.apple_icon_url,
      apple_strip_image_url: client.apple_strip_image_url,
      apple_background_color: client.apple_background_color,
      apple_text_color: client.apple_text_color,
      apple_label_color: client.apple_label_color,
      apple_pass_description: client.apple_pass_description,
      apple_organization_name: client.apple_organization_name || client.company_name,
      logo_text: client.logo_text,
      back_fields_info: client.back_fields_info,
      back_fields_terms: client.back_fields_terms,
      back_fields_website: client.back_fields_website,
      back_fields_phone: client.back_fields_phone,
      back_fields_address: client.back_fields_address,
      back_fields_instagram: client.back_fields_instagram,
      back_fields_facebook: client.back_fields_facebook,
      back_fields_tiktok: client.back_fields_tiktok,
    };

    const passBuffer = await passGenerator.generateLoyaltyPass(passData, customization, serialNumber, authenticationToken);

    // 6️⃣ Sauvegarder en BD (CRITIQUE pour Apple Wallet Sync)
    await db.query(
      `INSERT INTO wallet_cards (
        client_id, company_id, pass_serial_number, authentication_token,
        points_balance, stamps_balance, qr_code_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        pass_serial_number = VALUES(pass_serial_number),
        points_balance = VALUES(points_balance),
        last_updated = NOW()`,
      [
        client.id,
        client.company_id,
        serialNumber,
        authenticationToken,
        client.points || 0,
        0,
        client.id.toString(),
      ]
    );

    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="${client.prenom}_${client.nom}_Loyalty.pkpass"`);
    res.setHeader('Content-Length', passBuffer.length);
    res.send(passBuffer);

  } catch (error) {
    logger.error(`❌ Erreur GET /client-download: ${error.message}`);
    res.status(500).send('Erreur lors de la génération du pass.');
  }
};

export default {
  createWalletPass,
  addPointsToWallet,
  getWalletStatus,
  downloadClientPass,
};
