import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, '..', 'migrations', 'add-back-fields.sql');

async function runMigration() {
  try {
    console.log('--- Lancement de la migration des champs Verso ---');
    console.log('Recherche du fichier SQL :', sqlPath);
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Fichier SQL introuvable à : ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split par point-virgule et exécution ligne par ligne
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        console.log('Exécution de :', statement.substring(0, 100) + '...');
        await pool.query(statement);
        console.log('  ✅ Succès.');
      } catch (err) {
        if (err.message.includes('Duplicate column name')) {
          console.log('  ℹ️  Déjà existant (on ignore).');
        } else {
          console.error(`  ❌ Erreur sur cette ligne : ${err.message}`);
          // On continue quand même sur les autres champs
        }
      }
    }
    
    console.log('\n--- Fin de la migration ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur critique:', err.message);
    process.exit(1);
  }
}

runMigration();
