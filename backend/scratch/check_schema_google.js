import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'loyalty_saas'
  });

  try {
    console.log('--- Table: card_customization ---');
    const [cols] = await connection.execute('DESCRIBE card_customization');
    console.table(cols);
    
    console.log('\n--- Table: clients ---');
    const [clientCols] = await connection.execute('DESCRIBE clients');
    console.table(clientCols);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

checkSchema();
