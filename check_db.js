import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: 'frontend/.env' }); // or backend/.env? Let's try backend
dotenv.config({ path: 'backend/.env' });

async function check() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'projet_carte_fid',
    });
    
    // Just grab all from card_customization limit 1
    const [rows] = await pool.query('SELECT * FROM card_customization LIMIT 1');
    console.log(JSON.stringify(rows[0], null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();
