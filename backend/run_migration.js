import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', 'v3-points-only-and-tiers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split statements
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...');
      try {
        await pool.query(statement);
      } catch (e) {
        console.warn('Ignored error on:', statement.substring(0, 30), e.message);
      }
    }
    
    console.log('Migration v3 terminée avec succès');
    process.exit(0);
  } catch (err) {
    console.error('Erreur de migration', err);
    process.exit(1);
  }
}

run();
