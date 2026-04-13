import pool from '../db.js';

async function checkSchema() {
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM apple_pass_registrations');
    console.log(columns.map(c => c.Field));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkSchema();
