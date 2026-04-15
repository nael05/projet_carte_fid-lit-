
import db from './db.js';
import logger from './utils/logger.js';

async function diagnose() {
  console.log('🔍 DÉBUT DU DIAGNOSTIC...');
  
  try {
    // 1. Vérifier la connexion
    await db.query('SELECT 1');
    console.log('✅ Connexion DB : OK');

    // 2. Vérifier les colonnes de card_customization
    console.log('📊 Vérification des colonnes de card_customization...');
    const [columns] = await db.query('SHOW COLUMNS FROM card_customization');
    const columnNames = columns.map(c => c.Field);
    console.log('Colonnes trouvées :', columnNames.join(', '));

    const required = ['latitude', 'longitude', 'relevant_text'];
    const missing = required.filter(name => !columnNames.includes(name));

    if (missing.length > 0) {
      console.error('❌ COLONNES MANQUANTES :', missing.join(', '));
    } else {
      console.log('✅ Toutes les colonnes nécessaires sont là.');
    }

    // 3. Tester la requête de appleWebserviceController
    console.log('📑 Test de la requête SELECT de getUpdatedPass...');
    try {
      await db.query(`
        SELECT cc.latitude, cc.longitude, cc.relevant_text
        FROM card_customization cc
        LIMIT 1
      `);
      console.log('✅ Requête SELECT : OK');
    // 4. Vérifier les inscriptions Apple
    console.log('🍎 Vérification des inscriptions Apple Pass...');
    const [registrations] = await db.query('SELECT COUNT(*) as count FROM apple_pass_registrations');
    console.log(`Nombre d'enregistrements Push : ${registrations[0].count}`);

    // 5. Vérifier la table clients
    console.log('👥 Vérification de la table clients...');
    const [clientCols] = await db.query('SHOW COLUMNS FROM clients');
    console.log('Colonnes clients :', clientCols.map(c => `${c.Field} (${c.Type})`).join(', '));

  } catch (err) {
    console.error('💥 ERREUR GLOBALE DIAGNOSTIC :', err.message);
  } finally {
    process.exit();
  }
}

diagnose();
