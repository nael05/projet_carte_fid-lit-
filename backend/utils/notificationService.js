import pool from '../db.js';
import apnService from './apnService.js';
import logger from './logger.js';
import { randomUUID } from 'crypto';

/**
 * Service de notification pour les mises à jour de fidélité
 */
export const sendLoyaltyUpdateNotification = async (clientId, empresaId, pointsChange, isRedemption = false) => {
  try {
    // 1. Récupérer les infos du client et son nouveau solde
    const [clientRows] = await pool.query(
      'SELECT prenom, nom, points FROM clients WHERE id = ?',
      [clientId]
    );

    if (clientRows.length === 0) return;
    const client = clientRows[0];
    const newPoints = client.points || 0;

    // 2. Calculer le prochain palier
    const [nextTiers] = await pool.query(
      'SELECT title, points_required FROM reward_tiers WHERE entreprise_id = ? AND points_required > ? ORDER BY points_required ASC LIMIT 1',
      [empresaId, newPoints]
    );

    let nextTierMessage = '';
    if (nextTiers.length > 0) {
      const nextTier = nextTiers[0];
      const missingPoints = nextTier.points_required - newPoints;
      nextTierMessage = ` Il vous manque ${missingPoints} points pour le palier "${nextTier.title}".`;
    } else {
      // Check fallback reward in loyalty_config
      const [configRows] = await pool.query(
        'SELECT points_for_reward, reward_title FROM loyalty_config WHERE entreprise_id = ?',
        [empresaId]
      );
      if (configRows.length > 0) {
        const config = configRows[0];
        if (config.points_for_reward > newPoints) {
          const missing = config.points_for_reward - newPoints;
          nextTierMessage = ` Il vous manque ${missing} points pour votre prochaine récompense : "${config.reward_title || 'Cadeau'}".`;
        }
      }
    }

    // 3. Préparer le message
    let title = isRedemption ? 'Récompense validée ! 🎁' : 'Points ajoutés ! ✨';
    let body = isRedemption 
        ? `${Math.abs(pointsChange)} points utilisés.${nextTierMessage}`
        : `${pointsChange} points ajoutés ! Nouveau solde : ${newPoints} pts.${nextTierMessage}`;

    // 4. Récupérer les tokens push Apple Wallet
    const [registrations] = await pool.query(
      `SELECT r.push_token 
       FROM apple_pass_registrations r
       JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number
       WHERE w.client_id = ? AND w.company_id = ?`,
      [clientId, empresaId]
    );

    if (registrations.length === 0) {
      logger.info(`ℹ️ Pas d'appareil push trouvé pour client ${clientId}, notification visuelle ignorée.`);
      return;
    }

    // 5. Envoyer les notifications d'alerte (visibles)
    const pushTokens = registrations.map(r => r.push_token);
    await apnService.sendBulkAlertNotifications(pushTokens, title, body);

    // 6. Envoyer le signal silencieux (Update) pour forcer Apple Wallet à rafraîchir le contenu
    // Cela évite que le client voie la notification mais que la carte ne soit pas à jour.
    await apnService.sendBulkUpdateNotifications(pushTokens);

    logger.info(`✅ Notification de fidélité et signal Update envoyés au client ${clientId}: ${body}`);

  } catch (err) {
    logger.error(`❌ Erreur service notification fidélité: ${err.message}`);
  }
};

export default {
  sendLoyaltyUpdateNotification
};
