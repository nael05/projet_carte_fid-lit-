import { randomUUID } from 'crypto';
import pool from '../db.js';
import apnService from '../utils/apnService.js';
import googleWalletGenerator from '../utils/googleWalletGenerator.js';
import logger from '../utils/logger.js';

/**
 * Récupérer l'historique des notifications pour une entreprise
 */
export const getHistory = async (req, res) => {
  const empresaId = req.user.id;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM push_notifications_sent WHERE entreprise_id = ? ORDER BY created_at DESC',
      [empresaId]
    );

    res.json(rows);
  } catch (err) {
    logger.error('Error fetching push history:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
};

/**
 * Envoyer une notification push (ciblée ou à tous)
 */
export const sendNotification = async (req, res) => {
  const empresaId = req.user.id;
  const { clientIds, title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Le titre et le message sont requis' });
  }

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ error: 'Veuillez sélectionner au moins un client' });
  }

  try {
    // 1. Récupérer les push tokens pour les clients sélectionnés
    // On cherche dans apple_pass_registrations en passant par wallet_cards
    const [registrations] = await pool.query(
      `SELECT r.push_token, w.client_id, c.prenom, c.nom 
       FROM apple_pass_registrations r
       JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number
       JOIN clients c ON w.client_id = c.id
       WHERE w.client_id IN (?) AND w.company_id = ?`,
      [clientIds, empresaId]
    );

    // Vérifier aussi les clients Google avant de rejeter
    const [googleCheck] = await pool.query(
      `SELECT 1 FROM wallet_cards WHERE client_id IN (?) AND pass_serial_number LIKE 'GOOGLE_%' LIMIT 1`,
      [clientIds]
    );

    if (registrations.length === 0 && googleCheck.length === 0) {
      return res.status(404).json({ error: 'Aucun appareil enregistré trouvé pour les clients sélectionnés' });
    }

    const notificationId = randomUUID();
    await pool.query(
      `INSERT INTO push_notifications_sent (id, entreprise_id, title, message, target_type, recipients_count, status)
       VALUES (?, ?, ?, ?, 'specific', 0, 'sent')`,
      [notificationId, empresaId, title, message]
    );

    const pushTokens = registrations.map(r => r.push_token);
    const results = await apnService.sendBulkAlertNotifications(pushTokens, title, message);

    if (registrations.length > 0) {
      const now = new Date();
      const logValues = registrations.map(reg => {
        const result = results.results.find(r => r.token === reg.push_token);
        return [randomUUID(), reg.client_id, notificationId, reg.push_token, result?.sent ? 'sent' : 'failed', now];
      });
      await pool.query(
        `INSERT INTO client_push_notifications (id, client_id, notification_id, push_token, status, sent_at) VALUES ?`,
        [logValues]
      );
    }

    const [googleCards] = await pool.query(
      `SELECT DISTINCT w.client_id
       FROM wallet_cards w
       WHERE w.client_id IN (?) AND w.pass_serial_number LIKE 'GOOGLE_%'`,
      [clientIds]
    );
    const googleResults = await Promise.allSettled(
      googleCards.map(c => googleWalletGenerator.addMessageToObject(c.client_id, title, message))
    );
    const googleSent = googleResults.filter(r => r.status === 'fulfilled').length;

    await pool.query(
      'UPDATE push_notifications_sent SET sent_at = NOW(), recipients_count = ? WHERE id = ?',
      [registrations.length + googleCards.length, notificationId]
    );

    res.json({
      success: true,
      sentCount: results.sent + googleSent,
      failedCount: results.failed,
      message: `Notifications envoyées avec succès à ${results.sent} appareil(s) Apple et ${googleSent} appareil(s) Google.`
    });

  } catch (err) {
    logger.error('Error sending push notification:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'envoi des notifications' });
  }
};
