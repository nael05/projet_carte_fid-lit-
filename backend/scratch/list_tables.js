import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function listTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'loyalty_saas'
  });

  try {
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tables in ' + process.env.DB_NAME + ':');
    console.table(tables);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

listTables();
