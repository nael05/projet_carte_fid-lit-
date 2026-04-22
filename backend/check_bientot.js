import pool from './db.js';

async function checkDatabase() {
  console.log('🔍 Recherche du mot "Bientot" dans la base de données...');
  
  try {
    const tables = ['card_customization', 'entreprises', 'loyalty_config', 'clients'];
    
    for (const table of tables) {
      const [rows] = await pool.query(`SELECT * FROM ${table}`);
      console.log(`--- Table: ${table} (${rows.length} lignes) ---`);
      
      rows.forEach(row => {
        const str = JSON.stringify(row);
        if (str.toLowerCase().includes('bientot')) {
          console.log(`✅ TROUVÉ dans ${table} (ID: ${row.id}):`);
          console.log(JSON.stringify(row, null, 2));
          console.log('-----------------------------------');
        }
      });
    }
    
    console.log('🏁 Recherche terminée.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

checkDatabase();
