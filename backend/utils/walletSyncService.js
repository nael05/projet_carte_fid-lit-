import db from '../db.js';
import logger from './logger.js';
import apnService from './apnService.js';
import googleWalletGenerator from './googleWalletGenerator.js';

/**
 * Service centralisé pour synchroniser les Wallets (Apple & Google)
 */
class WalletSyncService {
  /**
   * Synchronise la carte d'un client spécifique
   * Appelé après un ajout de points, ajustement ou redemption
   */
  async syncClientWallet(clientId, companyId) {
    try {
      logger.info(`🔄 Synchronisation Wallet pour client ${clientId} (Entreprise: ${companyId})`);

      // 1. Récupérer les données fraîches du client et de son entreprise
      const [clientRows] = await db.query(
        `SELECT c.id, c.points, c.type_wallet, e.nom as company_name, e.loyalty_type
         FROM clients c
         JOIN entreprises e ON c.entreprise_id = e.id
         WHERE c.id = ? AND c.entreprise_id = ?`,
        [clientId, companyId]
      );

      if (!clientRows || clientRows.length === 0) {
        logger.warn(`⚠️ Impossible de synchroniser : Client ${clientId} non trouvé`);
        return;
      }

      const client = clientRows[0];
      const newBalance = client.points || 0;

      // 2. Récupérer les paliers de récompense actuels pour les inclure dans le texte
      const [tiers] = await db.query(
        'SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC',
        [companyId]
      );

      // 3. Mettre à jour la base de données de synchronisation (wallet_cards)
      // On force last_updated = NOW(3) pour avoir une précision à la milliseconde pour Apple
      await db.query(
        'UPDATE wallet_cards SET points_balance = ?, last_updated = NOW(3) WHERE client_id = ? AND company_id = ?',
        [newBalance, clientId, companyId]
      );

      // 4. Récupérer les infos de la carte pour Apple Wallet
      const [walletRows] = await db.query(
        'SELECT pass_serial_number FROM wallet_cards WHERE client_id = ? AND company_id = ?',
        [clientId, companyId]
      );

      if (walletRows.length > 0) {
        for (const wallet of walletRows) {
          const serial = wallet.pass_serial_number;

          // SYNCHRO APPLE WALLET
          if (serial && !serial.startsWith('GOOGLE_')) {
            const [registrations] = await db.query(
              'SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?',
              [serial]
            );

            if (registrations.length > 0) {
              const tokens = registrations.map(r => r.push_token);
              await apnService.sendBulkUpdateNotifications(tokens);
              logger.info(`   🍎 Apple Push envoyé à ${tokens.length} appareil(s) pour ${serial}`);
            }
          }

          // SYNCHRO GOOGLE WALLET
          if (serial && serial.startsWith('GOOGLE_')) {
            await googleWalletGenerator.updateLoyaltyObject(clientId, companyId, newBalance, tiers);
            logger.info(`   🤖 Google Wallet synchronisé pour ${clientId}`);
          }
        }
      }

      return { success: true, balance: newBalance };
    } catch (error) {
      logger.error(`❌ Erreur syncClientWallet (${clientId}):`, error);
      throw error;
    }
  }

  /**
   * Synchronise TOUTES les cartes d'une entreprise
   * Appelé après un changement de design ou de paliers de récompense
   */
  async syncCompanyWallets(companyId) {
    try {
      logger.info(`🔄 Synchronisation GLOBALE pour l'entreprise ${companyId}`);

      // 1. Mettre à jour la classe Google Wallet (Style/Template)
      const [customRows] = await db.query('SELECT * FROM card_customization WHERE company_id = ?', [companyId]);
      const [companyRows] = await db.query('SELECT nom FROM entreprises WHERE id = ?', [companyId]);
      
      if (customRows.length > 0 && companyRows.length > 0) {
        // On met à jour la classe pour chaque type de fidélité existant dans la personnalisation
        for (const config of customRows) {
          await googleWalletGenerator.createOrUpdateClass(companyId, config, companyRows[0].nom, config.loyalty_type);
        }
        logger.info(`   🤖 Google Class synchronisée`);
      }

      // 2. Forcer la mise à jour de la date sur TOUTES les cartes existantes pour Apple Wallet
      await db.query(
        'UPDATE wallet_cards SET last_updated = NOW(3) WHERE company_id = ?',
        [companyId]
      );

      // 3. Envoyer le Push Apple à TOUS les clients enregistrés
      const [registrations] = await db.query(
        `SELECT DISTINCT r.push_token 
         FROM apple_pass_registrations r
         JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number
         WHERE w.company_id = ?`,
        [companyId]
      );

      if (registrations.length > 0) {
        const tokens = registrations.map(r => r.push_token);
        await apnService.sendBulkUpdateNotifications(tokens);
        logger.info(`   🍎 Apple Push envoyé à ${tokens.length} client(s)`);
      }

      // 4. (Optionnel) Toucher les objets Google Wallet individuels si nécessaire
      // Note: Normalement class changes propagation suffit, mais on pourrait boucler si petits volumes.
      
      return { success: true, recipients: registrations.length };
    } catch (error) {
      logger.error(`❌ Erreur syncCompanyWallets (${companyId}):`, error);
      throw error;
    }
  }
}

export default new WalletSyncService();
