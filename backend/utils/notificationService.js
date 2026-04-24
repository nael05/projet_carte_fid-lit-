import pool from '../db.js';
import apnService from './apnService.js';
import googleWalletGenerator from './googleWalletGenerator.js';
import logger from './logger.js';
import { randomUUID } from 'crypto';

/**
 * Service de notification pour les mises à jour de fidélité
 */
export const sendLoyaltyUpdateNotification = async (clientId, empresaId, pointsChange, isRedemption = false) => {
  try {
    // 1. Récupération optimisée (Client + Config + Reward Tiers en moins de requêtes)
    const [combinedRows] = await pool.query(
      `SELECT c.prenom, c.nom, c.points, 
              lc.points_for_reward, lc.reward_title
       FROM clients c
       LEFT JOIN loyalty_config lc ON c.entreprise_id = lc.entreprise_id
       WHERE c.id = ? AND c.entreprise_id = ?`,
      [clientId, empresaId]
    );

    if (combinedRows.length === 0) return;
    const clientData = combinedRows[0];
    const newPoints = clientData.points || 0;

    // 2. Prochain palier
    const [nextTiers] = await pool.query(
      'SELECT title, points_required FROM reward_tiers WHERE entreprise_id = ? AND points_required > ? ORDER BY points_required ASC LIMIT 1',
      [empresaId, newPoints]
    );

    let nextTierMessage = '';
    if (nextTiers.length > 0) {
      const nextTier = nextTiers[0];
      const missingPoints = nextTier.points_required - newPoints;
      nextTierMessage = ` Il vous manque ${missingPoints} points pour le palier "${nextTier.title}".`;
    } else if (clientData.points_for_reward > newPoints) {
      const missing = clientData.points_for_reward - newPoints;
      nextTierMessage = ` Il vous manque ${missing} points pour votre prochaine récompense : "${clientData.reward_title || 'Cadeau'}".`;
    }

    // 3. Préparer le message
    let title = isRedemption ? 'Récompense validée ! 🎁' : 'Points ajoutés ! ✨';
    let body = isRedemption 
        ? `${Math.abs(pointsChange)} points utilisés.${nextTierMessage}`
        : `${pointsChange} points ajoutés ! Nouveau solde : ${newPoints} pts.${nextTierMessage}`;

    // 4. Récupérer les tokens push Apple et les cartes Google en simultané
    const [[registrations], [googleCards]] = await Promise.all([
      pool.query(
        `SELECT r.push_token
         FROM apple_pass_registrations r
         JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number
         WHERE w.client_id = ?`,
        [clientId]
      ),
      pool.query(
        `SELECT 1 FROM wallet_cards WHERE client_id = ? AND pass_serial_number LIKE 'GOOGLE_%' LIMIT 1`,
        [clientId]
      )
    ]);

    // 5. Lancer tout en parallèle (Apple et Google) - SANS ATTENDRE (Un-await pour dashboard instantané)
    const walletSyncModule = await import('./walletSyncService.js');
    const walletSyncService = walletSyncModule.default;
    const pushTokens = registrations.map(r => r.push_token);
    const hasGoogleWallet = googleCards.length > 0;

    // On lance en arrière-plan pour ne pas faire attendre le commerçant sur son dashboard.
    // Google : le message part APRÈS le sync pour que le solde affiché sur le pass soit déjà à jour.
    const googleNotifAfterSync = hasGoogleWallet
      ? walletSyncService.syncClientWallet(clientId, empresaId)
          .then(() => googleWalletGenerator.addMessageToObject(clientId, title, body))
      : walletSyncService.syncClientWallet(clientId, empresaId);

    Promise.all([
      googleNotifAfterSync,
      registrations.length > 0 ? apnService.sendBulkAlertNotifications(pushTokens, title, body) : Promise.resolve()
    ]).catch(err => logger.error('Notification parallel error', err));

    logger.info(`✅ Flux de notification lancé en tâche de fond pour ${clientId}`);

  } catch (err) {
    logger.error(`❌ Erreur service notification fidélité: ${err.message}`);
  }
};

export default {
  sendLoyaltyUpdateNotification
};
