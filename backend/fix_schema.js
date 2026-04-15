
import db from './db.js';

async function fixSchema() {
  console.log('🛠️ Lancement de la réparation du schéma...');
  
  try {
    const queries = [
      'ALTER TABLE card_customization ADD COLUMN back_fields_phone VARCHAR(50) DEFAULT NULL AFTER back_fields_website',
      'ALTER TABLE card_customization ADD COLUMN back_fields_address TEXT DEFAULT NULL AFTER back_fields_phone',
      'ALTER TABLE card_customization ADD COLUMN back_fields_instagram VARCHAR(255) DEFAULT NULL AFTER back_fields_address',
      'ALTER TABLE card_customization ADD COLUMN back_fields_facebook VARCHAR(255) DEFAULT NULL AFTER back_fields_instagram',
      'ALTER TABLE card_customization ADD COLUMN back_fields_tiktok VARCHAR(255) DEFAULT NULL AFTER back_fields_facebook'
    ];

    for (const query of queries) {
      try {
        await db.query(query);
        console.log(`✅ Succès : ${query.substring(0, 50)}...`);
      } catch (e) {
        if (e.code === 'ER_DUP_COLUMN_NAME') {
          console.log(`ℹ️ Colonne déjà présente : ${query.split(' ')[5]}`);
        } else {
          throw e;
        }
      }
    }

    console.log('🎉 Réparation terminée avec succès !');
  } catch (err) {
    console.error('❌ ERREUR LORS DE LA RÉPARATION :', err.message);
  } finally {
    process.exit();
  }
}

fixSchema();
