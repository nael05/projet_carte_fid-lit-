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

  } catch (err) {
    console.error('❌ Erreur lors de la synchronisation:', err.message);
  } finally {
    process.exit();
  }
}

sync();
