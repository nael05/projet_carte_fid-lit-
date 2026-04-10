import pool from './db.js';

async function listTables() {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    console.log('📋 Tables dans la base:', rows.map(r => Object.values(r)[0]));
    
    // Vérifier les 5 premières entrées de 'entreprises' (français)
    try {
      const [ents] = await pool.query('SELECT id, nom, email FROM entreprises LIMIT 5');
      console.log('🏢 Entreprises trouvées:', ents);
    } catch (e) {
      console.log('❌ Erreur sur la table "entreprises":', e.message);
    }

  } catch (err) {
    console.error('🔥 Erreur globale:', err.message);
  } finally {
    process.exit();
  }
}

listTables();
