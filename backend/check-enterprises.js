import pool from './db.js';

const checkEnterprises = async () => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nom, statut FROM entreprises LIMIT 10'
    );
    
    console.log('Entreprises trouvées:');
    if (rows.length === 0) {
      console.log('❌ AUCUNE ENTREPRISE!');
    } else {
      rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}`);
        console.log(`   Nom: ${row.nom}`);
        console.log(`   Statut: ${row.statut}\n`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  }
};

checkEnterprises();
