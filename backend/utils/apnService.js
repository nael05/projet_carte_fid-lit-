/**
 * APNService.js
 * Service pour envoyer les notifications Push Apple Wallet
 * Utilise le package 'apn' officiel
 */

import 'dotenv/config';
import apn from 'apn';
import logger from './logger.js';

export class APNService {
  constructor() {
    this.apnKeyPath = process.env.APPLE_APN_KEY_PATH;
    this.apnKeyId = process.env.APPLE_APN_KEY_ID;
    this.apnTeamId = process.env.APPLE_APN_TEAM_ID;
    this.environment = process.env.APPLE_APN_ENVIRONMENT || 'development';
    this.provider = null;

    this.initializeProvider();
  }

  /**
   * Initialise le provider APNs
   */
  initializeProvider() {
    try {
      if (!this.apnKeyPath || !this.apnKeyId || !this.apnTeamId) {
        logger.warn('⚠️ Configuration APNs incomplète - notifications push désactivées');
        return;
      }

      this.provider = new apn.Provider({
        // Clé P8 (format moderne, recommandé)
        key: this.apnKeyPath,
        keyId: this.apnKeyId,
        teamId: this.apnTeamId,

        // Production obligatoirement TRUE pour Apple Wallet (PassKit n'utilise pas la sandbox APNs)
        production: true,

        // Options de retry
        connectionRetryLimit: 3,
      });

      // Gestion des erreurs de connexion
      this.provider.on('error', (error) => {
        logger.error(`❌ Erreur APNs: ${error.message}`);
      });

      logger.info(`✅ Provider APNs initialisé (${this.environment})`);
    } catch (error) {
      logger.error(`❌ Impossible initialiser APNs: ${error.message}`);
      this.provider = null;
    }
  }

  /**
   * Envoie une notification SILENCIEUSE à Apple Wallet
   * Cette notification n'a pas de titre/body - c'est juste un signal de réveil
   * Apple Wallet recevra cette notification et saura qu'il faut se synchroniser
   *
   * @param {string} pushToken - Token APNs du device (fourni par Apple)
   * @param {Object} options - Options additionnelles (optionnel)
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async sendUpdateNotification(pushToken, options = {}) {
    if (!this.provider) {
      logger.warn('⚠️ APNs non configuré - notification non envoyée');
      return { sent: false, reason: 'APNs not configured' };
    }

    try {
      // Créer la notification silencieuse pour PassKit
      const notification = new apn.Notification();
      
      // Apple Wallet exige très strictement un payload vide {"aps": {}}
      notification.rawPayload = { aps: {} };

      // Indiquer explicitement que c'est une notification de background push (obligatoire sous iOS 13+ pour PassKit)
      notification.pushType = 'background';

      // Priorité 5 est requise en pushType 'background' sous iOS 13+ avec "aps": {}
      notification.priority = 5;
      notification.topic = process.env.APPLE_PASS_TYPE_ID;

      // Envoyer
      const result = await this.provider.send(notification, pushToken);

      // Vérifier le résultat
      if (result.failed && result.failed.length > 0) {
        const failure = result.failed[0];
        logger.warn(
          `⚠️ Notification échouée (token: ${pushToken.substring(0, 10)}...): ${failure.error || 'Raison inconnue'} (Status: ${failure.status || 'N/A'})`
        );
        if (failure.response) {
            logger.debug(`Détails échec APNs: ${JSON.stringify(failure.response)}`);
        }
        return { sent: false, error: failure.error, status: failure.status, token: pushToken };
      }

      logger.info(`✅ Notification envoyée au device (token: ${pushToken.substring(0, 20)}...)`);
      return { sent: true, token: pushToken };
    } catch (error) {
      logger.error(`❌ Erreur envoi notification: ${error.message}`);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Envoie une notification VISIBLE (Alerte)
   * @param {string} pushToken - Token APNs
   * @param {string} title - Titre de la notification
   * @param {string} body - Message de la notification
   * @returns {Promise<Object>}
   */
  async sendAlertNotification(pushToken, title, body) {
    if (!this.provider) {
      logger.warn('⚠️ APNs non configuré - notification non envoyée');
      return { sent: false, reason: 'APNs not configured' };
    }

    try {
      const notification = new apn.Notification({
        alert: {
          title,
          body
        },
        sound: 'default',
        badge: 1,
        topic: process.env.APPLE_PASS_TYPE_ID,
        payload: {
          click_action: 'APPLE_WALLET' // Aide le device à savoir quoi ouvrir
        }
      });

      const result = await this.provider.send(notification, pushToken);

      if (result.failed && result.failed.length > 0) {
        const failure = result.failed[0];
        logger.warn(`⚠️ Notification alerte échouée: ${failure.error || 'Statut: ' + failure.status}`);
        if (failure.response) {
            logger.debug(`Détails échec alerte APNs: ${JSON.stringify(failure.response)}`);
        }
        return { sent: false, error: failure.error || 'Status ' + failure.status, token: pushToken };
      }

      logger.info(`✅ Alert push envoyée (token: ${pushToken.substring(0, 10)}...)`);
      return { sent: true, token: pushToken };
    } catch (error) {
      logger.error(`❌ Erreur envoi alert push: ${error.message}`);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Envoie des notifications de mise à jour à plusieurs devices (Silencieux)
   * @param {string[]} pushTokens - Liste des tokens
   * @returns {Promise<Object>}
   */
  async sendBulkUpdateNotifications(pushTokens) {
    if (!Array.isArray(pushTokens) || pushTokens.length === 0) {
      return { sent: 0, failed: 0, results: [] };
    }

    const results = await Promise.all(
      pushTokens.map((token) => this.sendUpdateNotification(token))
    );

    const sent = results.filter((r) => r.sent).length;
    const failed = results.filter((r) => !r.sent).length;

    return { sent, failed, results };
  }

  /**
   * Envoie des notifications d'alerte à plusieurs devices
   * @param {string[]} pushTokens - Liste des tokens
   * @param {string} title - Titre
   * @param {string} body - Message
   * @returns {Promise<Object>}
   */
  async sendBulkAlertNotifications(pushTokens, title, body) {
    if (!Array.isArray(pushTokens) || pushTokens.length === 0) {
      return { sent: 0, failed: 0, results: [] };
    }

    logger.info(`📤 Envoi de ${pushTokens.length} alertes push`);

    const results = await Promise.all(
      pushTokens.map((token) => this.sendAlertNotification(token, title, body))
    );

    const sent = results.filter((r) => r.sent).length;
    const failed = results.filter((r) => !r.sent).length;

    return { sent, failed, results };
  }

  /**
   * Ferme la connexion APNs gracieusement
   */
  async close() {
    if (this.provider) {
      await this.provider.shutdown();
      logger.info('✅ Connexion APNs fermée');
    }
  }
}

// Exporter une instance singleton (lazy-loaded avec Proxy)
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new APNService();
  }
  return instance;
}

export const apnService = new Proxy({}, {
  get(target, property) {
    return getInstance()[property];
  }
});

export default apnService;
