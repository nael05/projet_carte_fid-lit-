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
      logger.info(`🔄 [SYNC] Début synchronisation pour client ${clientId} (Entreprise: ${companyId})`);

      // 1. Récupérer les données fraîches du client et de son entreprise
      const [clientRows] = await db.query(
        `SELECT c.id, c.points, c.type_wallet, e.nom as company_name, e.loyalty_type
         FROM clients c
         JOIN entreprises e ON c.entreprise_id = e.id
         WHERE c.id = ? AND c.entreprise_id = ?`,
        [clientId, companyId]
      );

      if (!clientRows || clientRows.length === 0) {
        logger.warn(`⚠️ [SYNC] ÉCHEC : Client [${clientId}] non trouvé pour l'entreprise [${companyId}]. Vérifiez s'il s'agit d'un UUID ou d'un Serial Number.`);
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
        // 🔄 PARALLÉLISATION : On lance toutes les mises à jour (Apple et Google) en même temps
        const syncPromises = walletRows.map(async (wallet) => {
          const serial = wallet.pass_serial_number;

          // SYNCHRO APPLE WALLET
          if (serial && !serial.startsWith('GOOGLE_')) {
            const [registrations] = await db.query(
              'SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?',
              [serial]
            );

            if (registrations.length > 0) {
              const tokens = registrations.map(r => r.push_token);
              logger.info(`   🍎 [SYNC-DEBUG] Envoi Push Apple vers ${tokens.length} terminal/terminaux`);
              logger.info(`   🍎 [SYNC-DEBUG] Tokens : ${tokens.join(', ').substring(0, 100)}...`);
              return apnService.sendBulkUpdateNotifications(tokens);
            } else {
              logger.warn(`   ⚠️ [SYNC-DEBUG] AUCUN terminal Apple enregistré pour le serial ${serial}`);
            }
          }

          // SYNCHRO GOOGLE WALLET
          if (serial && serial.startsWith('GOOGLE_')) {
            logger.info(`   🤖 [SYNC] Mise à jour Google Wallet`);
            return googleWalletGenerator.updateLoyaltyObject(clientId, companyId, newBalance, tiers);
          }
        });

        // On attend que TOUT soit lancé
        await Promise.all(syncPromises).catch(err => logger.error('Parallel sync error', err));
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
      logger.info(`   🍎 [SYNC GLOBALE] Recherche de terminaux Apple pour l'entreprise ID: ${companyId}...`);
      
      const [registrations] = await db.query(
        `SELECT DISTINCT r.push_token 
         FROM apple_pass_registrations r
         JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number
         WHERE w.company_id = ?`,
        [companyId]
      );
      
      if (registrations.length > 0) {
        const tokens = registrations.map(r => r.push_token);
        logger.info(`   🍎 [SYNC GLOBALE] ${tokens.length} terminal/terminaux trouvé(s). Envoi des notifications...`);
        // Non-bloquant pour la réactivité globale
        apnService.sendBulkUpdateNotifications(tokens).catch(err => 
          logger.error(`   🍎 [SYNC GLOBALE] Échec Push arrière-plan:`, err.message)
        );
      } else {
        logger.warn(`   ⚠️ [SYNC GLOBALE] Aucun terminal Apple enregistré trouvé pour l'entreprise ${companyId}.`);
        // Diagnostic : voir s'il y a des cartes sans enregistrements
        const [cardCount] = await db.query('SELECT COUNT(*) as count FROM wallet_cards WHERE company_id = ?', [companyId]);
        logger.info(`   📊 Diagnostic : ${cardCount[0].count} carte(s) trouvée(s) en base pour cette entreprise, mais 0 enregistrement Push.`);
      }

      // 4. Forcer la mise à jour visuelle pour Google Wallet (Touch des objets individuels)
      // V8.6 : Requête groupée (JOIN) pour éviter de requêter dans la boucle !
      const [googleWallets] = await db.query(
        `SELECT w.client_id, c.points 
         FROM wallet_cards w
         JOIN clients c ON w.client_id = c.id
         WHERE w.company_id = ? AND w.pass_serial_number LIKE "GOOGLE_%"`,
        [companyId]
      );

      if (googleWallets.length > 0) {
        const [rewardTiers] = await db.query(
          'SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC',
          [companyId]
        );

        logger.info(`   🚀 [SUPERCHARGED SYNC] Lancement global pour ${googleWallets.length} objets Google...`);

        // V8.6 : Regroupement total en paquets de 25 lancés EN PARALLÈLE
        const chunkSize = 25;
        const chunks = [];
        for (let i = 0; i < googleWallets.length; i += chunkSize) {
          chunks.push(googleWallets.slice(i, i + chunkSize));
        }

        // On lance TOUS les paquets en même temps sans attendre le précédent
        await Promise.all(chunks.map(async (chunk, index) => {
          try {
            await Promise.all(chunk.map(wallet => 
              googleWalletGenerator.updateLoyaltyObject(wallet.client_id, companyId, wallet.points, rewardTiers)
                .catch(err => logger.error(`      ❌ Erreur sync Google client ${wallet.client_id}:`, err.message))
            ));
            logger.debug(`   🤖 [SYNC V8.6] Paquet ${index + 1}/${chunks.length} terminé`);
          } catch (err) {
            logger.error(`   ❌ Échec partiel dans le paquet ${index + 1}:`, err.message);
          }
        }));

        logger.info(`   ✅ [SUPERCHARGED SYNC] Terminé avec succès !`);
      }
      
      return { success: true, recipients: registrations.length };
    } catch (error) {
      logger.error(`❌ Erreur syncCompanyWallets (${companyId}):`, error);
      throw error;
    }
  }
}

export default new WalletSyncService();
