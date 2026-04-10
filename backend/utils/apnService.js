/**
 * APNService.js
 * Service pour envoyer les notifications Push Apple Wallet
 * Utilise le package 'apn' officiel
 */

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

        // Production ou development
        production: this.environment === 'production',

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
      // Créer la notification silencieuse
      const notification = new apn.Notification({
        // Pas de contenu visible - juste pour réveiller l'app
        contentAvailable: true, // iOS background app refresh
        sound: false,
        badge: 0,
        alert: null,

        // Payload personnalisé (optionnel)
        // Apple Wallet n'utilise pas de custom payload, mais peut être utile pour le debug
        payload: {
          aps: {
            'content-available': 1,
          },
        },

        // Options
        priority: 10, // High priority pour le wallet
        expiration: Math.floor(Date.now() / 1000) + 3600, // Expire après 1 heure

        // Information pour les logs
        topic: process.env.APPLE_PASS_TYPE_ID, // Topic = Pass Type ID
      });

      // Envoyer
      const result = await this.provider.send(notification, pushToken);

      // Vérifier le résultat
      if (result.failed && result.failed.length > 0) {
        const failure = result.failed[0];
        logger.warn(
          `⚠️ Notification échouée (token: ${pushToken}): ${failure.error || 'Raison inconnue'}`
        );
        return { sent: false, error: failure.error, token: pushToken };
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
