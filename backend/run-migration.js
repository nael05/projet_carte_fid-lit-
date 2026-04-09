import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  let connection;
  try {
    console.log('📚 Exécution de la migration Apple Wallet...');
    console.log('Chemin script:', __dirname);
    
    // Créer une connexion
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'loyalty_saas',
      multipleStatements: true
    };
    
    console.log('Config DB:', { ...config, password: '***' });
    
    connection = await mysql.createConnection(config);

    // Lire le fichier migration
    const migrationPath = path.join(__dirname, 'migrations', 'add-apple-wallet-tables.sql');
    console.log('Migration file:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Fichier migration introuvable: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Exécuter
    await connection.query(sql);

    console.log('✅ Tables créées avec succès:');
    console.log('   - wallet_cards');
    console.log('   - apple_pass_registrations');
    console.log('   - pass_update_logs');

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur migration:');
    console.error('Message:', err.message);
    console.error('Code:', err.code);
    console.error('Détails:', err);
    process.exit(1);
  }
}

runMigration();
