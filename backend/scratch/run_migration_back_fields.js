import pool from '../db.js';
import fs from 'fs';
import path from 'path';

// Recherche du fichier SQL dans backend/migrations
const sqlPath = path.join(process.cwd(), 'backend', 'migrations', 'add-back-fields.sql');

async function runMigration() {
  try {
    console.log('--- Lancement de la migration des champs Verso ---');
    console.log('Fichier :', sqlPath);
    
    if (!fs.existsSync(sqlPath)) {
      // Fallback si on est déjà dans le dossier backend
      const fallbackPath = path.join(process.cwd(), 'migrations', 'add-back-fields.sql');
      if (fs.existsSync(fallbackPath)) {
        var finalPath = fallbackPath;
      } else {
        throw new Error('Fichier SQL introuvable.');
      }
    } else {
      var finalPath = sqlPath;
    }

    const sql = fs.readFileSync(finalPath, 'utf8');

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
