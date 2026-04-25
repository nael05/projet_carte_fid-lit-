import logger from './logger.js';

export const sendLoyaltyUpdateNotification = async (clientId, empresaId, pointsChange, _isRedemption = false) => {
  try {
    const walletSyncModule = await import('./walletSyncService.js');
    const walletSyncService = walletSyncModule.default;
    walletSyncService.syncClientWallet(clientId, empresaId, pointsChange)
      .catch(err => logger.error('Notification parallel error', err));
    logger.info(`✅ Flux de notification lancé en tâche de fond pour ${clientId}`);
  } catch (err) {
    logger.error(`❌ Erreur service notification fidélité: ${err.message}`);
  }
};

export default {
  sendLoyaltyUpdateNotification
};
