import pool from '../db.js';
import googleWalletGenerator from './googleWalletGenerator.js';
import logger from './logger.js';

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

    // 2. Prochain palier — on récupère tous les paliers pour savoir si l'entreprise en a
    const [allTiers] = await pool.query(
      'SELECT title, points_required FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC',
      [empresaId]
    );

    const nextTier = allTiers.find(t => t.points_required > newPoints);

    let nextTierMessage = '';
    if (nextTier) {
      const missingPoints = nextTier.points_required - newPoints;
      nextTierMessage = ` Il vous manque ${missingPoints} points pour le palier "${nextTier.title}".`;
    } else if (allTiers.length === 0 && clientData.points_for_reward > newPoints) {
      // Fallback legacy uniquement si aucun palier n'est défini pour cette entreprise
      const missing = clientData.points_for_reward - newPoints;
      nextTierMessage = ` Il vous manque ${missing} points pour votre prochaine récompense : "${clientData.reward_title || 'Cadeau'}".`;
    }

    // 3. Préparer le message
    let title = isRedemption ? 'Récompense validée ! 🎁' : 'Points ajoutés ! ✨';
    let body = isRedemption 
        ? `${Math.abs(pointsChange)} points utilisés.${nextTierMessage}`
        : `${pointsChange} points ajoutés ! Nouveau solde : ${newPoints} pts.${nextTierMessage}`;

    // 4. Vérifier si le client a un wallet Google
    const [googleCards] = await pool.query(
      `SELECT 1 FROM wallet_cards WHERE client_id = ? AND pass_serial_number LIKE 'GOOGLE_%' LIMIT 1`,
      [clientId]
    );
    const hasGoogleWallet = googleCards.length > 0;

    // 5. Lancer tout en arrière-plan sans bloquer le dashboard.
    //
    // Apple : la notification visible vient uniquement du changeMessage dans le pass
    // (secondaryField). Envoyer un alert push à un token passbook ferait afficher
    // "carte de fidélité modifiée" par iOS en écrasant le changeMessage.
    // walletSyncService envoie déjà le push silencieux qui déclenche le refresh du pass.
    //
    // Google : addMessageToObject part APRÈS le sync pour que le solde soit déjà à jour.
    const walletSyncModule = await import('./walletSyncService.js');
    const walletSyncService = walletSyncModule.default;

    const googleNotifAfterSync = hasGoogleWallet
      ? walletSyncService.syncClientWallet(clientId, empresaId)
          .then(() => googleWalletGenerator.addMessageToObject(clientId, title, body))
      : walletSyncService.syncClientWallet(clientId, empresaId);

    googleNotifAfterSync.catch(err => logger.error('Notification parallel error', err));

    logger.info(`✅ Flux de notification lancé en tâche de fond pour ${clientId}`);

  } catch (err) {
    logger.error(`❌ Erreur service notification fidélité: ${err.message}`);
  }
};

export default {
  sendLoyaltyUpdateNotification
};
