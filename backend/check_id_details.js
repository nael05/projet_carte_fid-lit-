import pool from './db.js';

async function checkDetails() {
  try {
    const [rows] = await pool.query("SHOW FULL COLUMNS FROM card_customization");
    const idCol = rows.find(r => r.Field === 'id');
    console.log('ID Column Details:', idCol);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
checkDetails();
