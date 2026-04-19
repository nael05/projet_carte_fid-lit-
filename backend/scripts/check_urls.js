import pool from '../db.js';

async function diagnose() {
  try {
    const [rows] = await pool.query('SELECT logo_url, apple_logo_url, strip_image_url FROM card_customization LIMIT 5');
    console.log('--- DIAGNOSTIC DES URLS ---');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

diagnose();
