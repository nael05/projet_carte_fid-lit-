
import db from './db.js';

async function migrateProduction() {
  console.log('🚀 DÉBUT DE LA MIGRATION DE PRODUCTION - FIDELYZAPP.FR');
  
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
        console.log(`✅ Succès : ${query.split(' ')[5]}`);
      } catch (e) {
        if (e.code === 'ER_DUP_COLUMN_NAME') {
          console.log(`ℹ️ Colonne déjà présente : ${query.split(' ')[5]}`);
        } else {
          console.error(`❌ Échec sur la requête : ${query}`, e.message);
        }
      }
    }

    console.log('🍎 Vérification de la table registrations...');
    const [regCols] = await db.query('SHOW COLUMNS FROM apple_pass_registrations');
    console.log('Colonnes registrations :', regCols.map(c => c.Field).join(', '));

    console.log('🎉 Migration de production terminée avec succès !');
  } catch (err) {
    console.error('💥 ERREUR CRITIQUE MIGRATION :', err.message);
  } finally {
    process.exit();
  }
}

migrateProduction();
