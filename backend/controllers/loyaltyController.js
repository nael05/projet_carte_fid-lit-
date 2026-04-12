import { v4 as uuidv4 } from 'uuid/dist/index.js';
import pool from '../db.js';
import logger from '../utils/logger.js';
import apnService from '../utils/apnService.js';

// ===== LOYALTY CONFIGURATION CONTROLLERS =====

/**
 * Obtenir la configuration de fidélité d'une entreprise
 */
export const getLoyaltyConfig = async (req, res) => {
  const empresaId = req.user.id;

  try {
    const [config] = await pool.query(
      `SELECT * FROM loyalty_config WHERE entreprise_id = ?`,
      [empresaId]
    );

    if (config.length === 0) {
      return res.status(404).json({ error: 'Configuration de fidélité non trouvée' });
    }

    res.json(config[0]);
  } catch (err) {
    logger.error('Get loyalty config error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Créer ou mettre à jour la configuration de fidélité
 */
export const updateLoyaltyConfig = async (req, res) => {
  const empresaId = req.user.id;
  const {
    loyalty_type,
    points_per_purchase,
    points_for_reward,
    stamps_count,
    stamps_per_purchase,
    stamps_for_reward,
    reward_title,
    reward_description,
    apple_wallet_key,
    google_wallet_key,
    push_notifications_enabled
  } = req.body;

  try {
    // Vérifier si une config existe déjà
    const [existing] = await pool.query(
      'SELECT id FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );

    if (existing.length > 0) {
      // Mettre à jour
      let final_stamps_for_reward = stamps_for_reward;
      let final_stamps_count = stamps_count;
      
      // On récupère le type actuel pour être sûr
      const [configData] = await pool.query('SELECT loyalty_type FROM loyalty_config WHERE entreprise_id = ?', [empresaId]);
      if (configData[0]?.loyalty_type === 'stamps') {
        final_stamps_for_reward = 10;
        final_stamps_count = 10;
      }

      await pool.query(
        `UPDATE loyalty_config SET 
          points_per_purchase = COALESCE(?, points_per_purchase),
          points_for_reward = COALESCE(?, points_for_reward),
          stamps_count = COALESCE(?, stamps_count),
          stamps_per_purchase = COALESCE(?, stamps_per_purchase),
          stamps_for_reward = COALESCE(?, stamps_for_reward),
          reward_title = COALESCE(?, reward_title),
          reward_description = COALESCE(?, reward_description),
          apple_wallet_key = COALESCE(?, apple_wallet_key),
          google_wallet_key = COALESCE(?, google_wallet_key),
          push_notifications_enabled = COALESCE(?, push_notifications_enabled),
          updated_at = NOW()
         WHERE entreprise_id = ?`,
        [
          points_per_purchase, points_for_reward,
          final_stamps_count, stamps_per_purchase, final_stamps_for_reward,
          reward_title, reward_description,
          apple_wallet_key, google_wallet_key,
          push_notifications_enabled, empresaId
        ]
      );
    } else {
      // Créer
      const configId = uuidv4();
      await pool.query(
        `INSERT INTO loyalty_config (
          id, entreprise_id, loyalty_type, points_per_purchase, points_for_reward,
          stamps_count, stamps_per_purchase, stamps_for_reward,
          reward_title, reward_description,
          apple_wallet_key, google_wallet_key, push_notifications_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          configId, empresaId, loyalty_type || 'points',
          points_per_purchase || 1, points_for_reward || 10,
          stamps_count || 10, stamps_per_purchase || 1, stamps_for_reward || 10,
          reward_title || 'Récompense', reward_description || '',
          apple_wallet_key || '', google_wallet_key || '',
          push_notifications_enabled !== false
        ]
      );
    }

    res.json({ success: true, message: 'Configuration de fidélité mise à jour' });
  } catch (err) {
    logger.error('Update loyalty config error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
};

// ===== STAMP SYSTEM CONTROLLERS =====

/**
 * Ajouter des tampons lors d'un paiement
 */
export const addStamps = async (req, res) => {
  const { clientId } = req.params;
  const { stamps_to_add } = req.body;
  const empresaId = req.user.id;

  if (typeof stamps_to_add !== 'number' || stamps_to_add <= 0) {
    return res.status(400).json({ error: 'Nombre de tampons invalide' });
  }

  try {
    // Vérifier que le client appartient à cette entreprise
    const [clientRows] = await pool.query(
      'SELECT id FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // Obtenir ou créer les tampons du client
    const [stampRows] = await pool.query(
      'SELECT id, stamps_collected FROM customer_stamps WHERE client_id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (stampRows.length === 0) {
      await pool.query(
        'INSERT INTO customer_stamps (id, client_id, entreprise_id, stamps_collected) VALUES (?, ?, ?, ?)',
        [uuidv4(), clientId, empresaId, stamps_to_add]
      );
    } else {
      await pool.query(
        'UPDATE customer_stamps SET stamps_collected = stamps_collected + ? WHERE client_id = ? AND entreprise_id = ?',
        [stamps_to_add, clientId, empresaId]
      );
    }

    // Obtenir la nouvelle valeur et la config
    const [configRows] = await pool.query(
      'SELECT stamps_for_reward, reward_title FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );
    const config = configRows[0] || { stamps_for_reward: 10, reward_title: 'Cadeau' };
    const threshold = Number(config.stamps_for_reward || 10);

    const [updatedStamps] = await pool.query(
      'SELECT stamps_collected FROM customer_stamps WHERE client_id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    let newStamps = Number(updatedStamps[0].stamps_collected || 0);
    let rewardReached = false;

    if (newStamps >= threshold) {
      rewardReached = true;
      newStamps = 0;
      await pool.query(
        'UPDATE customer_stamps SET stamps_collected = 0 WHERE client_id = ? AND entreprise_id = ?',
        [clientId, empresaId]
      );

      // Enregistrer la transaction de récompense
      await pool.query(
        `INSERT INTO transaction_history (id, client_id, entreprise_id, type, description)
         VALUES (?, ?, ?, 'reward_claimed', ?)`,
        [uuidv4(), clientId, empresaId, `Récompense atteinte et Reset : ${config.reward_title}`]
      );
    }

    // Enregistrer la transaction d'ajout
    await pool.query(
      `INSERT INTO transaction_history (id, client_id, entreprise_id, type, stamps_change, description)
       VALUES (?, ?, ?, 'stamps_added', ?, ?)`,
      [uuidv4(), clientId, empresaId, stamps_to_add, `${stamps_to_add} tampon(s) ajouté(s)`]
    );

    // 📱 Mise à jour Apple Wallet (Stamps)
    try {
      const [walletRows] = await pool.query(
        'SELECT id, pass_serial_number FROM wallet_cards WHERE client_id = ? AND company_id = ?',
        [clientId, empresaId]
      );

      if (walletRows.length > 0) {
        const wallet = walletRows[0];
        
        // Mettre à jour le solde dans wallet_cards
        await pool.query(
          'UPDATE wallet_cards SET stamps_balance = ?, last_updated = NOW() WHERE id = ?',
          [newStamps, wallet.id]
        );

        // Log de mise à jour du pass
        await pool.query(
          `INSERT INTO pass_update_logs (
            wallet_card_id, pass_serial_number, action, value, old_balance, new_balance, description, triggered_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            wallet.id, 
            wallet.pass_serial_number, 
            rewardReached ? 'reward_reset' : 'add_stamps', 
            stamps_to_add, 
            rewardReached ? threshold : (newStamps - stamps_to_add), 
            newStamps, 
            rewardReached ? `Récompense atteinte et Reset : ${config.reward_title}` : 'Ajout manuel de tampons', 
            'pro_add_stamps'
          ]
        );

        // Envoyer les notifications push
        const [registrations] = await pool.query(
          'SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?',
          [wallet.pass_serial_number]
        );

        if (registrations.length > 0) {
          const pushTokens = registrations.map(r => r.push_token);
          
          if (rewardReached) {
            // Notification d'alerte (Visible)
            for (const token of pushTokens) {
              await apnService.sendAlertNotification(
                token, 
                "Félicitations ! 🎁", 
                `Vous avez gagné votre récompense : ${config.reward_title}`,
                { action: 'reward', company: 'Votre Commerçant' }
              );
            }
          } else {
            // Mise à jour silencieuse
            await apnService.sendBulkUpdateNotifications(pushTokens);
          }
          logger.info(`📱 Push envoyé pour ajout tampons (client: ${clientId}, reward: ${rewardReached})`);
        }
      }
    } catch (walletErr) {
      logger.error('Erreur mise à jour wallet après ajout manuel de tampons:', walletErr.message);
    }

    res.json({
      success: true,
      stamps_collected: newStamps,
      stamps_redeemed: updatedStamps[0].stamps_redeemed,
      message: `${stamps_to_add} tampon(s) ajouté(s)`
    });
  } catch (err) {
    logger.error('Add stamps error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Réclamer une récompense en tampons
 */
export const claimStampReward = async (req, res) => {
  const { clientId } = req.params;
  const empresaId = req.user.id;

  try {
    // Obtenir la config de fidélité
    const [config] = await pool.query(
      'SELECT stamps_for_reward FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );

    if (config.length === 0) {
      return res.status(404).json({ error: 'Configuration de fidélité non trouvée' });
    }

    const stampsRequired = config[0].stamps_for_reward;

    // Vérifier les tampons du client
    const [stamps] = await pool.query(
      'SELECT id, stamps_collected FROM customer_stamps WHERE client_id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (stamps.length === 0 || stamps[0].stamps_collected < stampsRequired) {
      return res.status(400).json({
        error: 'Tampons insuffisants',
        current: stamps.length > 0 ? stamps[0].stamps_collected : 0,
        required: stampsRequired
      });
    }

    // Réduire les tampons et augmenter les remboursés
    await pool.query(
      `UPDATE customer_stamps 
       SET stamps_collected = stamps_collected - ?, stamps_redeemed = stamps_redeemed + ?
       WHERE client_id = ?`,
      [stampsRequired, 1, clientId]
    );

    // Enregistrer la transaction
    const transactionId = uuidv4();
    await pool.query(
      `INSERT INTO transaction_history (id, client_id, entreprise_id, type, stamps_change, description)
       VALUES (?, ?, ?, 'stamps_redeemed', ?, ?)`,
      [transactionId, clientId, empresaId, -stampsRequired, 'Récompense réclamée']
    );

    const [updatedStamps] = await pool.query(
      'SELECT stamps_collected, stamps_redeemed FROM customer_stamps WHERE client_id = ?',
      [clientId]
    );

    const newStamps = updatedStamps[0].stamps_collected;

    // 📱 Mise à jour Apple Wallet (Récompense)
    try {
      const [walletRows] = await pool.query(
        'SELECT id, pass_serial_number FROM wallet_cards WHERE client_id = ? AND company_id = ?',
        [clientId, empresaId]
      );

      if (walletRows.length > 0) {
        const wallet = walletRows[0];
        
        // Mettre à jour le solde dans wallet_cards
        await pool.query(
          'UPDATE wallet_cards SET stamps_balance = ?, last_updated = NOW() WHERE id = ?',
          [newStamps, wallet.id]
        );

        // Log de mise à jour du pass
        await pool.query(
          `INSERT INTO pass_update_logs (
            wallet_card_id, pass_serial_number, action, value, old_balance, new_balance, description, triggered_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [wallet.id, wallet.pass_serial_number, 'stamps_redeemed', -stampsRequired, newStamps + stampsRequired, newStamps, 'Récompense réclamée', 'pro_claim_reward']
        );

        // Envoyer les notifications push
        if (registrations.length > 0) {
          const pushTokens = registrations.map(r => r.push_token);
          
          // Notification d'alerte (Visible)
          for (const token of pushTokens) {
            await apnService.sendAlertNotification(
              token, 
              "Récompense validée ! 🎉", 
              `Votre récompense a été validée avec succès.`,
              { action: 'reward_claimed' }
            );
          }
          logger.info(`📱 Notification push d'alerte envoyée pour récompense tampons (client: ${clientId})`);
        }
      }
    } catch (walletErr) {
      logger.error('Erreur mise à jour wallet après récompense tampons:', walletErr.message);
    }

    res.json({
      success: true,
      stamps_collected: newStamps,
      stamps_redeemed: updatedStamps[0].stamps_redeemed,
      message: 'Récompense réclamée avec succès!'
    });
  } catch (err) {
    logger.error('Claim stamp reward error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ===== PUSH NOTIFICATIONS CONTROLLERS =====

/**
 * Créer et envoyer une notification push
 */
export const sendPushNotification = async (req, res) => {
  const empresaId = req.user.id;
  const {
    title,
    message,
    target_type = 'all',
    target_segment = null,
    schedule_for = null
  } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Titre et message requis' });
  }

  try {
    const notificationId = uuidv4();
    const status = schedule_for ? 'scheduled' : 'sent';
    const sentAt = schedule_for ? null : new Date();

    // Créer la notification
    await pool.query(
      `INSERT INTO push_notifications_sent 
       (id, entreprise_id, title, message, target_type, target_segment, status, sent_at, scheduled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notificationId, empresaId, title, message,
        target_type, target_segment, status,
        sentAt,
        schedule_for ? new Date(schedule_for) : null
      ]
    );

    // Déterminer les clients cibles
    let clientQuery = `
      SELECT c.id FROM clients c
      LEFT JOIN customer_stamps cs ON c.id = cs.client_id
      WHERE c.entreprise_id = ?
    `;
    let params = [empresaId];

    if (target_segment === 'active') {
      clientQuery += ' AND (c.points > 0 OR COALESCE(cs.stamps_collected, 0) > 0)';
    } else if (target_segment === 'inactive') {
      clientQuery += ' AND (c.points = 0 OR c.points IS NULL) AND (COALESCE(cs.stamps_collected, 0) = 0)';
    }

    const [clients] = await pool.query(clientQuery, params);

    // Créer les entrées de notification pour chaque client
    const pushNotifications = clients.map(client => ({
      id: uuidv4(),
      client_id: client.id,
      notification_id: notificationId,
      status: 'pending'
    }));

    for (const notification of pushNotifications) {
      await pool.query(
        `INSERT INTO client_push_notifications 
         (id, client_id, notification_id, status)
         VALUES (?, ?, ?, ?)`,
        [notification.id, notification.client_id, notification.notification_id, notification.status]
      );
    }

    // Mettre à jour le nombre de destinataires
    await pool.query(
      'UPDATE push_notifications_sent SET recipients_count = ? WHERE id = ?',
      [pushNotifications.length, notificationId]
    );

    res.json({
      success: true,
      notificationId,
      recipientsCount: pushNotifications.length,
      status,
      message: `Notification ${schedule_for ? 'programmée' : 'envoyée'} à ${pushNotifications.length} client(s)`
    });
  } catch (err) {
    logger.error('Send push notification error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
};

/**
 * Obtenir l'historique des notifications
 */
export const getPushNotificationHistory = async (req, res) => {
  const empresaId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const [notifications] = await pool.query(
      `SELECT * FROM push_notifications_sent 
       WHERE entreprise_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [empresaId, parseInt(limit), parseInt(offset)]
    );

    const [totalCount] = await pool.query(
      'SELECT COUNT(*) as count FROM push_notifications_sent WHERE entreprise_id = ?',
      [empresaId]
    );

    res.json({
      notifications,
      total: totalCount[0].count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    logger.error('Get push notification history error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Obtenir les détails d'une notification
 */
export const getPushNotificationDetails = async (req, res) => {
  const empresaId = req.user.id;
  const { notificationId } = req.params;

  try {
    const [notification] = await pool.query(
      `SELECT * FROM push_notifications_sent 
       WHERE id = ? AND entreprise_id = ?`,
      [notificationId, empresaId]
    );

    if (notification.length === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    // Obtenir le statut des destinataires
    const [recipients] = await pool.query(
      `SELECT status, COUNT(*) as count FROM client_push_notifications 
       WHERE notification_id = ? 
       GROUP BY status`,
      [notificationId]
    );

    res.json({
      notification: notification[0],
      recipientStats: recipients
    });
  } catch (err) {
    logger.error('Get push notification details error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ===== APPLE WALLET CONTROLLER =====

/**
 * Créer et télécharger un pass Apple Wallet
 * 
 * Endpoint: POST /api/wallet/apple
 * Authentification: JWT Token requis
 * 
 * Body:
 * {
 *   "clientId": "string (UUID)",
 *   "entrepriseId": "string (UUID)"
 * }
 * 
 * Réponse: Fichier .pkpass binaire
 */
export const createAppleWalletPass = async (req, res) => {
  const { clientId, entrepriseId } = req.body;

  // Validation des paramètres
  if (!clientId || !entrepriseId) {
    return res.status(400).json({
      error: 'Paramètres manquants',
      required: ['clientId', 'entrepriseId']
    });
  }

  try {
    logger.info('📱 Demande de génération Apple Wallet Pass', {
      clientId,
      entrepriseId,
      requestedBy: req.user?.id
    });

    // Vérifier que le client appartient à l'entreprise et récupérer ses infos
    const [clients] = await pool.query(
      `SELECT 
        id, 
        CONCAT(COALESCE(prenom, ''), ' ', COALESCE(nom, '')) as fullName,
        prenom as firstName,
        nom as lastName,
        email, 
        points, 
        card_number as cardNumber
       FROM clients 
       WHERE id = ? AND entreprise_id = ?`,
      [clientId, entrepriseId]
    );

    if (clients.length === 0) {
      return res.status(404).json({
        error: 'Client non trouvé',
        details: `Aucun client trouvé avec l'ID ${clientId} dans l'entreprise ${entrepriseId}`
      });
    }

    const clientData = clients[0];

    // Préparer les données pour la génération du pass
    const passData = {
      id: clientData.id,
      firstName: clientData.firstName || 'Client',
      lastName: clientData.lastName || '',
      email: clientData.email || 'contact@fidelyz.com',
      points: clientData.points || 0,
      cardNumber: clientData.cardNumber || clientData.id
    };

    logger.debug('📋 Données du client préparées', { passData });

    // Générer le pass via le module dédié
    const passBuffer = await generateAppleWalletPass(passData);

    // Configurer la réponse HTTP
    const filename = `fidelyz-${clientData.id}.pkpass`;
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', passBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Envoyer le pass
    res.send(passBuffer);

    logger.info('✅ Apple Wallet Pass généré et envoyé avec succès', {
      clientId: clientData.id,
      filename,
      fileSize: passBuffer.length + ' bytes',
      Email: clientData.email
    });

  } catch (error) {
    // Logging détaillé de l'erreur
    logger.error('❌ Erreur lors de la génération Apple Wallet Pass', {
      clientId,
      entrepriseId,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Retourner un message d'erreur approprié
    const statusCode = error.message.includes('non trouvé') ? 404 : 500;
    res.status(statusCode).json({
      error: 'Impossible de générer le pass Apple Wallet',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { details: error.stack })
    });
  }
};

/**
 * Obtenir les statistiques de fidélité (pour le dashboard)
 */
export const getLoyaltyStats = async (req, res) => {
  const empresaId = req.user.id;

  try {
    const [config] = await pool.query(
      'SELECT loyalty_type FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );

    if (config.length === 0) {
      return res.status(404).json({ error: 'Configuration de fidélité non trouvée' });
    }

    const loyaltyType = config[0].loyalty_type;

    // Obtenir les stats
    let stats = {
      totalClients: 0,
      loyaltyType: loyaltyType
    };

    if (loyaltyType === 'points') {
      const [pointsStats] = await pool.query(
        `SELECT 
          COUNT(*) as totalClients,
          AVG(points) as avgPoints,
          MAX(points) as maxPoints,
          SUM(points) as totalPoints
         FROM clients WHERE entreprise_id = ?`,
        [empresaId]
      );

      stats = {
        ...stats,
        ...(pointsStats[0] || {})
      };
    } else {
      // Pour les stamps, on compte juste les clients
      const [stampsStats] = await pool.query(
        `SELECT 
          COUNT(*) as totalClients
         FROM clients WHERE entreprise_id = ?`,
        [empresaId]
      );

      stats = {
        ...stats,
        ...(stampsStats[0] || {})
      };
    }

    res.json(stats);
  } catch (err) {
    logger.error('Get loyalty stats error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
