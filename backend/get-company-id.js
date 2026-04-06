import pool from './db.js';

const [rows] = await pool.query('SELECT id, nom FROM entreprises LIMIT 1');
if (rows.length > 0) {
  console.log(`ID: ${rows[0].id}`);
  console.log(`Nom: ${rows[0].nom}`);
} else {
  console.log('Aucune entreprise trouvée');
}
process.exit(0);
