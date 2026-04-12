import pool from '../db.js';

async function sync() {
  console.log('--- Database Synchronization ---');
  try {
    // Vérifier si la colonne updated_at existe
    const [columns] = await pool.query('SHOW COLUMNS FROM loyalty_config LIKE "updated_at"');
    
    if (columns.length === 0) {
      console.log('Ajout de la colonne updated_at à loyalty_config...');
      await pool.query('ALTER TABLE loyalty_config ADD COLUMN updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      console.log('✅ Colonne ajoutée avec succès.');
    } else {
      console.log('✅ La colonne updated_at existe déjà.');
    }

    // Vérifier si la table transaction_history existe
    console.log('Vérification de la table transaction_history...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transaction_history (
        id varchar(36) NOT NULL,
        client_id varchar(36) NOT NULL,
        entreprise_id varchar(36) NOT NULL,
        type enum('add_points','redeem_points','add_stamps','redeem_stamps','reward_unlocked') DEFAULT NULL,
        points_change int DEFAULT NULL,
        stamps_change int DEFAULT NULL,
        description varchar(255) DEFAULT NULL,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_client (client_id),
        KEY idx_entreprise (entreprise_id),
        KEY idx_type (type),
        KEY idx_created (created_at),
        CONSTRAINT transaction_history_ibfk_1 FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
        CONSTRAINT transaction_history_ibfk_2 FOREIGN KEY (entreprise_id) REFERENCES entreprises (id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    console.log('✅ Table transaction_history prête.');

  } catch (err) {
    console.error('❌ Erreur lors de la synchronisation:', err.message);
  } finally {
    process.exit();
  }
}

sync();
