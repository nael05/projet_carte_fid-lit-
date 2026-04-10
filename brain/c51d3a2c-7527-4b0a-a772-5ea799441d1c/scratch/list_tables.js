import pool from '../../../../backend/db.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../../../backend/.env' });

async function listTables() {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    console.log('Tables:');
    rows.forEach(row => console.log(Object.values(row)[0]));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listTables();
