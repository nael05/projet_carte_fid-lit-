import pool from './db.js';

async function runFix() {
  console.log('🚀 Démarrage de la migration de secours pour card_customization...');

  const columnsToAdd = [
    { name: 'apple_logo_url', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'apple_icon_url', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'apple_strip_image_url', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'apple_background_color', type: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'apple_text_color', type: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'apple_label_color', type: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'apple_pass_description', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'apple_organization_name', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'relevant_text', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'google_primary_color', type: 'VARCHAR(7) DEFAULT "#1f2937"' },
    { name: 'google_text_color', type: 'VARCHAR(7) DEFAULT "#ffffff"' },
    { name: 'google_logo_url', type: 'TEXT DEFAULT NULL' },
    { name: 'google_hero_image_url', type: 'TEXT DEFAULT NULL' },
    { name: 'google_card_title', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'google_card_subtitle', type: 'VARCHAR(100) DEFAULT NULL' }
  ];

  try {
    // 2. Récupérer les colonnes existantes pour card_customization
    const [existingColumns] = await pool.query('SHOW COLUMNS FROM card_customization');
    const existingNames = existingColumns.map(c => c.Field);

    // 3. Ajouter les manquantes pour card_customization
    for (const col of columnsToAdd) {
      if (!existingNames.includes(col.name)) {
        console.log(`➕ Ajout de la colonne : ${col.name} à card_customization`);
        await pool.query(`ALTER TABLE card_customization ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // 4. Vérifier apple_pass_registrations
    const [existingRegColumns] = await pool.query('SHOW COLUMNS FROM apple_pass_registrations');
    const existingRegNames = existingRegColumns.map(c => c.Field);

    if (!existingRegNames.includes('pass_type_identifier')) {
      console.log('➕ Ajout de la colonne : pass_type_identifier à apple_pass_registrations');
      await pool.query('ALTER TABLE apple_pass_registrations ADD COLUMN pass_type_identifier VARCHAR(100) DEFAULT NULL');
      // Mettre à jour les anciennes lignes avec le type par défaut si possible
      if (process.env.APPLE_PASS_TYPE_ID) {
        await pool.query('UPDATE apple_pass_registrations SET pass_type_identifier = ? WHERE pass_type_identifier IS NULL', [process.env.APPLE_PASS_TYPE_ID]);
      }
    }

    console.log('🎉 Migration terminée avec succès !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de la migration :', err.message);
    process.exit(1);
  }
}

runFix();
