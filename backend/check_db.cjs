const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function check() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'loyalty_saas',
    });
    
    const [rows] = await pool.query('SELECT company_id, loyalty_type, latitude, longitude, relevant_text, locations FROM card_customization');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();
