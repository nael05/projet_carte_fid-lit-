import pool from './db.js';
import logger from './utils/logger.js';

async function migrate_locations() {
  try {
    console.log('Adding locations JSON column to card_customization...');
    await pool.query('ALTER TABLE card_customization ADD COLUMN locations JSON NULL;');
    console.log('✅ Column locations added successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Column locations already exists.');
    } else {
      console.error('❌ Error:', err.message);
    }
  } finally {
    process.exit(0);
  }
}

migrate_locations();
