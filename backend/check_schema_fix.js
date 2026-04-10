import pool from './db.js';

async function checkSchema() {
  try {
    const [columns] = await pool.query('DESCRIBE card_customization');
    console.log('📊 Colonnes de card_customization:', columns.map(c => ({ name: c.Field, type: c.Type })));
    
    const [companiesCols] = await pool.query('DESCRIBE entreprises');
    console.log('📊 Colonnes de entreprises:', companiesCols.map(c => ({ name: c.Field, type: c.Type })));

  } catch (err) {
    console.error('🔥 Erreur:', err.message);
  } finally {
    process.exit();
  }
}

checkSchema();
