/**
 * WalletAppController.js
 * API utilisée par le Frontend pour créer des passes et gérer les points
 *
 * Endpoints:
 * - POST /api/app/wallet/create : Crée un nouveau pass pour un client
 * - POST /api/app/wallet/add-points : Ajoute des points et notifie via push
 */

import { v4 as uuidv4 } from 'uuid';
import { passGenerator } from '../utils/passGenerator.js';
import { apnService } from '../utils/apnService.js';
import db from '../db.js';
import logger from '../utils/logger.js';

/**
 * POST /api/app/wallet/create
 * Crée un nouveau pass Apple Wallet pour un client
 *
 * Body: { clientId }
 * Response: Fichier .pkpass en téléchargement direct
 */
export const createWalletPass = async (req, res) => {
  try {
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId manquant' });
    }

    logger.info(`📱 Création pass Apple Wallet pour client: ${clientId}`);

    // 1️⃣ Récupérer le client + entreprise + customization
    const [clientRows] = await db.query(
      `SELECT c.id, c.prenom, c.nom, c.telephone, c.points, c.stamps_collected,
              e.id as company_id, e.nom as company_name, e.loyalty_type,
              cc.apple_logo_url, cc.apple_icon_url, cc.apple_background_color,
              cc.apple_text_color, cc.apple_label_color, cc.apple_pass_description,
              cc.apple_organization_name
       FROM clients c
       LEFT JOIN enterprises e ON c.enterprise_id = e.id
       LEFT JOIN card_customization cc ON e.id = cc.company_id
       WHERE c.id = ? OR c.uuid = ?`,
      [clientId, clientId]
    );

    if (!clientRows || clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const client = clientRows[0];
    const { company_id, company_name, loyalty_type, points, stamps_collected } = client;

    if (!company_id) {
      return res.status(400).json({ error: 'Client sans entreprise associée' });
    }

    // 2️⃣ Vérifier si le client a déjà une carte
    const [existingCards] = await db.query(
      'SELECT id FROM wallet_cards WHERE client_id = ?',
      [client.id]
    );

    if (existingCards.length > 0) {
      return res.status(400).json({
        error: 'Ce client possède déjà une carte Apple Wallet',
        serialNumber: existingCards[0].pass_serial_number,
      });
    }

    // 3️⃣ Générer un serial number unique et token d'authentification
    const serialNumber = uuidv4().replace(/-/g, '').substring(0, 20).toUpperCase();
    const authenticationToken = uuidv4();

    logger.info(`🔐 Serial: ${serialNumber}, Token: ${authenticationToken.substring(0, 20)}...`);

    // 4️⃣ Préparer données pour la génération du pass
    const passData = {
      clientId: client.id,
      firstName: client.prenom,
      lastName: client.nom,
      phoneNumber: client.telephone,
      companyName: company_name,
      loyaltyType: loyalty_type || 'points',
      balance: loyalty_type === 'stamps' ? (stamps_collected || 0) : (points || 0),
      stampMaxCount: 10, // À paramétrer dans card_customization si besoin
      createdAt: client.created_at || new Date(),
      qrCodeValue: client.id.toString(), // Le QR du client
    };

    const customization = {
      apple_logo_url: client.apple_logo_url,
      apple_icon_url: client.apple_icon_url,
      apple_background_color: client.apple_background_color,
      apple_text_color: client.apple_text_color,
      apple_label_color: client.apple_label_color,
      apple_pass_description: client.apple_pass_description,
      apple_organization_name: client.apple_organization_name,
    };

    // 5️⃣ Générer le fichier .pkpass
    const passBuffer = await passGenerator.generateLoyaltyPass(
      passData,
      customization,
      serialNumber,
      authenticationToken
    );

    // 6️⃣ Sauvegarder en BD
    const [insertResult] = await db.query(
      `INSERT INTO wallet_cards (
        client_id, company_id, pass_serial_number, authentication_token,
        points_balance, stamps_balance, qr_code_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        client.id,
        company_id,
        serialNumber,
        authenticationToken,
        loyalty_type === 'stamps' ? 0 : (points || 0),
        loyalty_type === 'stamps' ? (stamps_collected || 0) : 0,
        client.id.toString(),
      ]
    );

    logger.info(`✅ Carte créée en BD avec ID: ${insertResult.insertId}`);

    // 7️⃣ Envoyer le fichier .pkpass
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="${serialNumber}.pkpass"`);
    res.setHeader('Content-Length', passBuffer.length);
    res.send(passBuffer);

    logger.info(`✅ Pass délivré au client (${passBuffer.length} bytes)`);
  } catch (error) {
    logger.error(`❌ Erreur création pass: ${error.message}`);
    res.status(500).json({ error: 'Erreur création pass Apple Wallet', details: error.message });
  }
};

/**
 * POST /api/app/wallet/add-points
 * Ajoute des points/tampons et envoie notification push
 *
 * Body: { clientId, pointsToAdd, reason }
 * Response: { success, newBalance, notificationsSent }
 */
export const addPointsToWallet = async (req, res) => {
  try {
    const { clientId, pointsToAdd, reason } = req.body;

    if (!clientId || !pointsToAdd) {
      return res.status(400).json({ error: 'clientId et pointsToAdd requis' });
    }

    if (isNaN(pointsToAdd) || pointsToAdd === 0) {
      return res.status(400).json({ error: 'pointsToAdd doit être un nombre non-zéro' });
    }

    logger.info(`➕ Ajout de ${pointsToAdd} point(s) au client ${clientId}`);

    // 1️⃣ Récupérer la carte du client
    const [walletRows] = await db.query(
      `SELECT wc.id, wc.pass_serial_number, wc.points_balance, wc.stamps_balance,
              c.enterprise_id, e.loyalty_type
       FROM wallet_cards wc
       JOIN clients c ON wc.client_id = c.id
       JOIN enterprises e ON c.enterprise_id = e.id
       WHERE wc.client_id = ? OR wc.pass_serial_number = ?`,
      [clientId, clientId]
    );

    if (!walletRows || walletRows.length === 0) {
      return res.status(404).json({ error: 'Pas de carte Apple Wallet pour ce client' });
    }

    const wallet = walletRows[0];
    const { id: walletId, pass_serial_number, loyalty_type } = wallet;

    // 2️⃣ Calculer le nouveau solde
    const isStamps = loyalty_type === 'stamps';
    const oldBalance = isStamps ? wallet.stamps_balance : wallet.points_balance;
    const newBalance = oldBalance + pointsToAdd;

    // 3️⃣ Mettre à jour en BD
    const updateColumn = isStamps ? 'stamps_balance' : 'points_balance';
    await db.query(`UPDATE wallet_cards SET ${updateColumn} = ? WHERE id = ?`, [
      newBalance,
      walletId,
    ]);

    // 4️⃣ Enregistrer dans l'historique
    await db.query(
      `INSERT INTO pass_update_logs (
        wallet_card_id, pass_serial_number, action, value, old_balance, new_balance,
        description, triggered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        walletId,
        pass_serial_number,
        isStamps ? 'add_stamps' : 'add_points',
        pointsToAdd,
        oldBalance,
        newBalance,
        reason || 'API update',
        'admin_api',
      ]
    );

    // 5️⃣ Récupérer tous les devices enregistrés et envoyer notifications
    const [registrations] = await db.query(
      'SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?',
      [pass_serial_number]
    );

    let notificationsSent = 0;
    if (registrations && registrations.length > 0) {
      const pushTokens = registrations.map((r) => r.push_token);
      const notificationResults = await apnService.sendBulkUpdateNotifications(pushTokens);
      notificationsSent = notificationResults.sent;

      // Marquer les envois en BD (optionnel)
      await db.query(
        'UPDATE pass_update_logs SET push_notification_sent = 1 WHERE wallet_card_id = ? ORDER BY id DESC LIMIT 1',
        [walletId]
      );
    }

    logger.info(
      `✅ Points ajoutés: ${oldBalance} → ${newBalance}, Notifications: ${notificationsSent}`
    );

    res.json({
      success: true,
      oldBalance,
      newBalance,
      notificationsSent,
      message: `${pointsToAdd} point(s) ajouté(s) au client`,
    });
  } catch (error) {
    logger.error(`❌ Erreur ajout points: ${error.message}`);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de points', details: error.message });
  }
};

/**
 * GET /api/app/wallet/status/:clientId
 * Récupère le statut actuel de la carte du client
 *
 * Response: { clientId, balance, registered, devices, lastSync }
 */
export const getWalletStatus = async (req, res) => {
  try {
    const { clientId } = req.params;

    // 1️⃣ Récupérer la carte
    const [walletRows] = await db.query(
      `SELECT wc.id, wc.pass_serial_number, wc.points_balance, wc.stamps_balance, 
              wc.wallet_added_at, wc.last_updated,
              e.loyalty_type, COUNT(apr.id) as device_count
       FROM wallet_cards wc
       LEFT JOIN clients c ON wc.client_id = c.id
       LEFT JOIN enterprises e ON c.enterprise_id = e.id
       LEFT JOIN apple_pass_registrations apr ON wc.pass_serial_number = apr.pass_serial_number
       WHERE wc.client_id = ? OR wc.pass_serial_number = ?
       GROUP BY wc.id`,
      [clientId, clientId]
    );

    if (!walletRows || walletRows.length === 0) {
      return res.status(404).json({ error: 'Pas de carte Apple Wallet' });
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

export default {
  createWalletPass,
  addPointsToWallet,
  getWalletStatus,
};
