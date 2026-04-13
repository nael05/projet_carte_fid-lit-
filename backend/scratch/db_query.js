import pool from '../db.js';

async function run() {
  try {
    const [rows] = await pool.query('SELECT * FROM wallet_cards');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
