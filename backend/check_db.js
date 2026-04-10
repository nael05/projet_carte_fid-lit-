import pool from './db.js';

async function checkUser() {
  try {
    const [rows] = await pool.execute('SELECT email, nom, statut FROM enterprises WHERE email = ?', ['nael@example.com']);
    if (rows.length === 0) {
      console.log('❌ Utilisateur nael@example.com NON TROUVÉ');
      const [all] = await pool.execute('SELECT email, nom FROM enterprises LIMIT 5');
      console.log('📋 Liste des 5 premières entreprises:', all);
    } else {
      console.log('✅ Utilisateur trouvé:', rows[0]);
    }
  } catch (err) {
    console.error('🔥 Erreur DB:', err.message);
  } finally {
    process.exit();
  }
}

checkUser();
