import pool from '../db.js';

async function checkSchema() {
  try {
    const [rows] = await pool.query('DESCRIBE wallet_cards');
    console.log('--- SCHEMA WALLET_CARDS ---');
    rows.forEach(row => {
      console.log(`${row.Field}: ${row.Type}`);
    });
    console.log('---------------------------');
    process.exit(0);
  } catch (err) {
    console.error('Error checking schema:', err.message);
    process.exit(1);
  }
}

checkSchema();
