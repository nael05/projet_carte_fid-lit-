import pool from '../db.js';
import logger from '../utils/logger.js';

async function checkSchema() {
  try {
    const [rows] = await pool.query('DESCRIBE card_customization');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Error fetching schema:', err.message);
    process.exit(1);
  }
}

checkSchema();
