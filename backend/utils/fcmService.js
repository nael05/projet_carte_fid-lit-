import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FCMService {
  constructor() {
    this.messaging = null;
    this._init();
  }

  _init() {
    try {
      const rawPath = process.env.GOOGLE_WALLET_KEY_PATH || 'certs/google-wallet-key.json';
      const keyPath = path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(__dirname, '..', rawPath);

      if (!fs.existsSync(keyPath)) {
        logger.warn(`⚠️ [FCM] Clés introuvables: ${keyPath}`);
        return;
      }

      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

      const existing = getApps().find(a => a.name === 'fidelyz-fcm');
      const app = existing || initializeApp({ credential: cert(serviceAccount) }, 'fidelyz-fcm');

      this.messaging = getMessaging(app);
      logger.info('✅ [FCM] Service initialisé');
    } catch (err) {
      logger.error(`❌ [FCM] Erreur initialisation: ${err.message}`);
    }
  }

  async sendNotification(fcmToken, title, body) {
    if (!this.messaging || !fcmToken) return { sent: false };

    try {
      await this.messaging.send({
        token: fcmToken,
        notification: { title, body },
        webpush: {
          notification: { title, body, icon: '/favicon.ico' },
          fcmOptions: { link: '/' }
        }
      });
      logger.info(`✅ [FCM] Notification envoyée: "${title}"`);
      return { sent: true };
    } catch (err) {
      if (err.code === 'messaging/registration-token-not-registered') {
        logger.warn(`⚠️ [FCM] Token invalide/expiré, à supprimer`);
        return { sent: false, invalidToken: true };
      }
      logger.error(`❌ [FCM] Erreur envoi: ${err.message}`);
      return { sent: false };
    }
  }

  async sendBulkNotification(tokens, title, body) {
    if (!this.messaging || !Array.isArray(tokens) || tokens.length === 0) {
      return { sent: 0, total: 0 };
    }

    const results = await Promise.allSettled(
      tokens.map(token => this.sendNotification(token, title, body))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value?.sent).length;
    const invalidTokens = results
      .filter(r => r.status === 'fulfilled' && r.value?.invalidToken)
      .map((_, i) => tokens[i]);

    logger.info(`📤 [FCM] ${sent}/${tokens.length} notifications envoyées`);
    return { sent, total: tokens.length, invalidTokens };
  }
}

export default new FCMService();
