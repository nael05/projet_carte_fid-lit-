import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Recherche intelligente du fichier SQL (remonte d'un cran si on est dans scratch)
const sqlPath = path.join(__dirname, '..', 'migrations', 'add-back-fields.sql');

async function runMigration() {
  try {
    console.log('--- Lancement de la migration des champs Verso ---');
    console.log('Recherche du fichier SQL :', sqlPath);
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Fichier SQL introuvable à : ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log('Exécution de :', statement.substring(0, 50) + '...');
      await pool.query(statement);
    }
    
    console.log('✅ Migration terminée avec succès.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de la migration:', err.message);
    process.exit(1);
  }
}

runMigration();
