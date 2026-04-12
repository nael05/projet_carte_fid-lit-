import pool from '../db.js';

async function checkSchema() {
  try {
    const tables = ['clients', 'loyalty_config', 'wallet_cards', 'transaction_history', 'apple_pass_registrations'];
    for (const table of tables) {
      try {
        const [rows] = await pool.query(`DESCRIBE \`${table}\``);
        console.log(`Table: ${table}`);
        console.table(rows);
      } catch (e) {
        console.error(`Missing or error for table ${table}:`, e.message);
      }
    }
  } catch (err) {
    console.error('Schema check failed:', err);
  } finally {
    process.exit();
  }
}

checkSchema();
