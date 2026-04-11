import db from '../db.js';
import logger from '../utils/logger.js';

async function migrate() {
  try {
    logger.info('Starting migration: Adding type_wallet to clients table...');
    
    // Vérifier si la colonne existe déjà via INFORMATION_SCHEMA
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'type_wallet'
        AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      await db.query(`
        ALTER TABLE clients 
        ADD COLUMN type_wallet ENUM('apple', 'google') DEFAULT 'apple'
      `);
      logger.info('Migration successful: type_wallet column added.');
    } else {
      logger.info('Column type_wallet already exists, skipping.');
    }
    
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed', err);
    process.exit(1);
  }
}

migrate();
