import { randomUUID } from 'crypto';
import pool from '../db.js';
import logger from '../utils/logger.js';
import apnService from '../utils/apnService.js';
import walletSyncService from '../utils/walletSyncService.js';

// ===== LOYALTY CONFIGURATION CONTROLLERS =====

/**
 * Obtenir la configuration de fidélité et les paliers d'une entreprise
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

    // Récupérer les paliers de récompense
    const [tiers] = await pool.query(
      `SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC`,
      [empresaId]
    );

    res.json({
      ...config[0],
      reward_tiers: tiers
    });
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
    points_adding_mode,
    points_per_purchase,
    max_points_per_transaction,
    apple_wallet_key,
    google_wallet_key,
    push_notifications_enabled
  } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT id FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );

    if (existing.length > 0) {
      // Construction dynamique de la requête d'UPDATE
      const updates = [];
      const params = [];

      if (points_adding_mode !== undefined) {
        updates.push('points_adding_mode = ?');
        params.push(points_adding_mode);
      }
      if (points_per_purchase !== undefined) {
        updates.push('points_per_purchase = ?');
        params.push(points_per_purchase);
      }
      if (apple_wallet_key !== undefined) {
        updates.push('apple_wallet_key = ?');
        params.push(apple_wallet_key);
      }
      if (google_wallet_key !== undefined) {
        updates.push('google_wallet_key = ?');
        params.push(google_wallet_key);
      }
      if (push_notifications_enabled !== undefined) {
        updates.push('push_notifications_enabled = ?');
        params.push(push_notifications_enabled ? 1 : 0);
      }
      if (max_points_per_transaction !== undefined) {
        updates.push('max_points_per_transaction = ?');
        // null = pas de limite, sinon valeur entière positive
        params.push(max_points_per_transaction === null ? null : Math.max(1, parseInt(max_points_per_transaction) || 1));
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        params.push(empresaId);
        const sql = `UPDATE loyalty_config SET ${updates.join(', ')} WHERE entreprise_id = ?`;
        await pool.query(sql, params);
      }
    } else {
      const configId = randomUUID();
      await pool.query(
        `INSERT INTO loyalty_config (
          id, entreprise_id, points_adding_mode, points_per_purchase,
          apple_wallet_key, google_wallet_key, push_notifications_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          configId, 
          empresaId, 
          points_adding_mode || 'automatic', 
          points_per_purchase || 10,
          apple_wallet_key || '', 
          google_wallet_key || '',
          push_notifications_enabled !== false ? 1 : 0
        ]
      );
    }

    // 🔄 Synchronisation en temps réel pour tous les clients du club
    walletSyncService.syncCompanyWallets(empresaId).catch(err => 
      logger.error('Global synchronization failed after loyalty config update', err)
    );

    res.json({ success: true, message: 'Configuration de fidélité mise à jour' });
  } catch (err) {
    logger.error('Update loyalty config error for enterprise: ' + empresaId, { 
      error: err.message, 
      stack: err.stack 
    });
    // Message V3 pour confirmer que le code est bien à jour sur le serveur
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ===== REWARD TIERS CONTROLLERS =====

export const getRewardTiers = async (req, res) => {
  const empresaId = req.user.id;
  try {
    const [tiers] = await pool.query(
      `SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC`,
      [empresaId]
    );
    res.json(tiers);
  } catch (err) {
    logger.error('Get reward tiers error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const createRewardTier = async (req, res) => {
  const empresaId = req.user.id;
  const { points_required, title, description } = req.body;

  if (!points_required || !title) {
    return res.status(400).json({ error: 'points_required et title sont obligatoires' });
  }

  try {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO reward_tiers (id, entreprise_id, points_required, title, description) VALUES (?, ?, ?, ?, ?)`,
      [id, empresaId, points_required, title, description || '']
    );

    // 🔄 Sync Wallets (Background)
    walletSyncService.syncCompanyWallets(empresaId).catch(err => logger.error('Sync failed tier create', err));

    res.status(201).json({ success: true, id, message: 'Palier ajouté' });
  } catch (err) {
    logger.error('Create reward tier error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const updateRewardTier = async (req, res) => {
  const empresaId = req.user.id;
  const tierId = req.params.id;
  const { points_required, title, description } = req.body;

  try {
    await pool.query(
      `UPDATE reward_tiers SET points_required = COALESCE(?, points_required), title = COALESCE(?, title), description = COALESCE(?, description) WHERE id = ? AND entreprise_id = ?`,
      [points_required, title, description, tierId, empresaId]
    );

    // 🔄 Sync Wallets (Background)
    walletSyncService.syncCompanyWallets(empresaId).catch(err => logger.error('Sync failed tier update', err));

    res.json({ success: true, message: 'Palier mis à jour' });
  } catch (err) {
    logger.error('Update reward tier error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const deleteRewardTier = async (req, res) => {
  const empresaId = req.user.id;
  const tierId = req.params.id;

  try {
    await pool.query(
      `DELETE FROM reward_tiers WHERE id = ? AND entreprise_id = ?`,
      [tierId, empresaId]
    );

    // 🔄 Sync Wallets (Background)
    walletSyncService.syncCompanyWallets(empresaId).catch(err => logger.error('Sync failed tier delete', err));

    res.json({ success: true, message: 'Palier supprimé' });
  } catch (err) {
    logger.error('Delete reward tier error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ===== PUSH NOTIFICATIONS CONTROLLERS =====

export const sendPushNotification = async (req, res) => {
  const empresaId = req.user.id;
  const { title, message, target_type = 'all', target_segment = null, schedule_for = null } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Titre et message requis' });
  }

  try {
    const notificationId = randomUUID();
    const status = schedule_for ? 'scheduled' : 'sent';
    const sentAt = schedule_for ? null : new Date();

    await pool.query(
      `INSERT INTO push_notifications_sent 
       (id, entreprise_id, title, message, target_type, target_segment, status, sent_at, scheduled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [notificationId, empresaId, title, message, target_type, target_segment, status, sentAt, schedule_for ? new Date(schedule_for) : null]
    );

    let clientQuery = `SELECT id, points FROM clients WHERE entreprise_id = ?`;
    let params = [empresaId];

    if (target_segment === 'active') {
      clientQuery += ' AND points > 0';
    } else if (target_segment === 'inactive') {
      clientQuery += ' AND (points = 0 OR points IS NULL)';
    }

    const [clients] = await pool.query(clientQuery, params);

    const pushNotifications = clients.map(client => ({
      id: randomUUID(),
      client_id: client.id,
      notification_id: notificationId,
      status: 'pending'
    }));

    for (const notification of pushNotifications) {
      await pool.query(
        `INSERT INTO client_push_notifications (id, client_id, notification_id, status) VALUES (?, ?, ?, ?)`,
        [notification.id, notification.client_id, notification.notification_id, notification.status]
      );
    }

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

export const getPushNotificationHistory = async (req, res) => {
  const empresaId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const [notifications] = await pool.query(
      `SELECT * FROM push_notifications_sent WHERE entreprise_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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

export const getPushNotificationDetails = async (req, res) => {
  const empresaId = req.user.id;
  const { notificationId } = req.params;

  try {
    const [notification] = await pool.query(
      `SELECT * FROM push_notifications_sent WHERE id = ? AND entreprise_id = ?`,
      [notificationId, empresaId]
    );

    if (notification.length === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    const [recipients] = await pool.query(
      `SELECT status, COUNT(*) as count FROM client_push_notifications WHERE notification_id = ? GROUP BY status`,
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

export const getLoyaltyStats = async (req, res) => {
  const empresaId = req.user.id;

  try {
    const [pointsStats] = await pool.query(
      `SELECT 
        COUNT(*) as totalClients,
        AVG(points) as avgPoints,
        MAX(points) as maxPoints,
        SUM(points) as totalPoints
        FROM clients WHERE entreprise_id = ?`,
      [empresaId]
    );

    const stats = {
      loyaltyType: 'points',
      ...pointsStats[0]
    };

    res.json(stats);
  } catch (err) {
    logger.error('Get loyalty stats error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
