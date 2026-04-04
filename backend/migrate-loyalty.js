import pool from './db.js';
import * as fs from 'fs';
import * as path from 'path';

const applyLoyaltyMigration = async () => {
  try {
    console.log('🔄 Démarrage de la migration du système de fidélité...');
    
    // Lire le fichier de migration
    const migrationPath = path.join(process.cwd(), '..', 'migration-loyalty-system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Fichier migration-loyalty-system.sql non trouvé');
      process.exit(1);
    }

    const migration = fs.readFileSync(migrationPath, 'utf8');
    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
      .filter(s => !s.startsWith('\n'));

    let successCount = 0;
    let errorCount = 0;

    console.log(`📝 ${statements.length} requêtes SQL à exécuter\n`);

    for (let i = 0; i < statements.length; i++) {
      try {
        const statement = statements[i];
        if (statement.trim()) {
          await pool.query(statement);
          console.log(`✅ [${i + 1}/${statements.length}] Requête exécutée`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ [${i + 1}/${statements.length}] Erreur:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== RÉSUMÉ ===');
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('🎉 Migration complète avec succès!');
    } else {
      console.log('⚠️ Migration complétée avec des erreurs');
    }

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  }
};

applyLoyaltyMigration();
