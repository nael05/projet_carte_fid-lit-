import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';

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
    console.error(err);
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
      await pool.query(
        `UPDATE loyalty_config SET 
          loyalty_type = COALESCE(?, loyalty_type),
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
          loyalty_type, points_per_purchase, points_for_reward,
          stamps_count, stamps_per_purchase, stamps_for_reward,
          reward_title, reward_description,
          apple_wallet_key, google_wallet_key,
          push_notifications_enabled, empresaId
        ]
      );

      // Mettre à jour aussi la table entreprises
      await pool.query(
        `UPDATE entreprises SET 
          loyalty_type = COALESCE(?, loyalty_type),
          points_per_purchase = COALESCE(?, points_per_purchase),
          points_for_reward = COALESCE(?, points_for_reward),
          stamps_count = COALESCE(?, stamps_count),
          stamps_per_purchase = COALESCE(?, stamps_per_purchase),
          stamps_for_reward = COALESCE(?, stamps_for_reward),
          apple_wallet_key = COALESCE(?, apple_wallet_key),
          google_wallet_key = COALESCE(?, google_wallet_key),
          push_notifications_enabled = COALESCE(?, push_notifications_enabled)
         WHERE id = ?`,
        [
          loyalty_type, points_per_purchase, points_for_reward,
          stamps_count, stamps_per_purchase, stamps_for_reward,
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

      // Mettre à jour aussi la table entreprises
      await pool.query(
        `UPDATE entreprises SET 
          loyalty_type = ?, points_per_purchase = ?, points_for_reward = ?,
          stamps_count = ?, stamps_per_purchase = ?, stamps_for_reward = ?,
          apple_wallet_key = ?, google_wallet_key = ?, push_notifications_enabled = ?
         WHERE id = ?`,
        [
          loyalty_type || 'points',
          points_per_purchase || 1, points_for_reward || 10,
          stamps_count || 10, stamps_per_purchase || 1, stamps_for_reward || 10,
          apple_wallet_key || '', google_wallet_key || '',
          push_notifications_enabled !== false, empresaId
        ]
      );
    }

    res.json({ success: true, message: 'Configuration de fidélité mise à jour' });
  } catch (err) {
    console.error(err);
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
      'SELECT id, stamps_collected FROM customer_stamps WHERE client_id = ?',
      [clientId]
    );

    if (stampRows.length === 0) {
      // Créer l'entrée des tampons
      const stampId = uuidv4();
      await pool.query(
        'INSERT INTO customer_stamps (id, client_id, entreprise_id, stamps_collected) VALUES (?, ?, ?, ?)',
        [stampId, clientId, empresaId, stamps_to_add]
      );
    } else {
      // Ajouter aux tampons existants
      await pool.query(
        'UPDATE customer_stamps SET stamps_collected = stamps_collected + ? WHERE client_id = ?',
        [stamps_to_add, clientId]
      );
    }

    // Enregistrer la transaction
    const transactionId = uuidv4();
    await pool.query(
      `INSERT INTO transaction_history (id, client_id, entreprise_id, type, stamps_change, description)
       VALUES (?, ?, ?, 'stamps_added', ?, ?)`,
      [transactionId, clientId, empresaId, stamps_to_add, `${stamps_to_add} tampon(s) ajouté(s)`]
    );

    // Récupérer l'état actuel
    const [updatedStamps] = await pool.query(
      'SELECT stamps_collected, stamps_redeemed FROM customer_stamps WHERE client_id = ?',
      [clientId]
    );

    res.json({
      success: true,
      stamps_collected: updatedStamps[0].stamps_collected,
      stamps_redeemed: updatedStamps[0].stamps_redeemed,
      message: `${stamps_to_add} tampon(s) ajouté(s)`
    });
  } catch (err) {
    console.error(err);
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

    res.json({
      success: true,
      stamps_collected: updatedStamps[0].stamps_collected,
      stamps_redeemed: updatedStamps[0].stamps_redeemed,
      message: 'Récompense réclamée avec succès!'
    });
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
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
          COUNT(DISTINCT client_id) as totalClients,
          AVG(points) as avgPoints,
          MAX(points) as maxPoints,
          SUM(points) as totalPoints
         FROM clients WHERE entreprise_id = ?`,
        [empresaId]
      );

      stats = {
        ...stats,
        ...pointsStats[0]
      };
    } else {
      const [stampsStats] = await pool.query(
        `SELECT 
          COUNT(DISTINCT client_id) as totalClients,
          AVG(stamps_collected) as avgStamps,
          MAX(stamps_collected) as maxStamps,
          SUM(stamps_collected) as totalStamps,
          SUM(stamps_redeemed) as totalRedeemed
         FROM customer_stamps WHERE entreprise_id = ?`,
        [empresaId]
      );

      stats = {
        ...stats,
        ...stampsStats[0]
      };
    }

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
