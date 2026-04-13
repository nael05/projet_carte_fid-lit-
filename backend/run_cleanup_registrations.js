import pool from './db.js';

async function cleanup() {
  try {
    console.log('🧹 Nettoyage des enregistrements corrompus (NULL)...');
    const [result] = await pool.query('DELETE FROM apple_pass_registrations WHERE pass_type_identifier IS NULL');
    console.log(`✅ ${result.affectedRows} enregistrements supprimés.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanup();
