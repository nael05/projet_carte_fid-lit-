import pool from './db.js';
import logger from './utils/logger.js';

async function migrate() {
  try {
    console.log('🚀 Démarrage de la migration : Suppression de la contrainte unique client_id...');
    
    // 1. Ajouter un index non-unique d'abord pour ne pas casser la FK
    await pool.query('CREATE INDEX idx_client_id_multi ON wallet_cards(client_id)');
    console.log('✅ Index non-unique ajouté.');

    // 2. Supprimer la Foreign Key temporairement
    await pool.query('ALTER TABLE wallet_cards DROP FOREIGN KEY wallet_cards_ibfk_1');
    console.log('✅ Foreign Key supprimée temporairement.');

    // 3. Supprimer l'index UNIQUE
    await pool.query('ALTER TABLE wallet_cards DROP INDEX client_id');
    console.log('✅ Index UNIQUE(client_id) supprimé.');

    // 4. Recréer la Foreign Key sur le nouvel index
    await pool.query('ALTER TABLE wallet_cards ADD CONSTRAINT wallet_cards_ibfk_1 FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE');
    console.log('✅ Foreign Key recréée sur l\'index non-unique.');

    console.log('🎉 Migration terminée avec succès !');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('ℹ️ L\'index client_id n\'existait pas ou est déjà supprimé.');
      process.exit(0);
    }
    console.error('❌ Erreur migration:', err.message);
    process.exit(1);
  }
}

migrate();
