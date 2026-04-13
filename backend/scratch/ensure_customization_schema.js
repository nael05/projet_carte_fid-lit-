import pool from '../db.js';

async function ensureSchema() {
  console.log('🚀 Checking card_customization schema...');
  
  const columnsToAdd = [
    { name: 'loyalty_type', type: 'ENUM("points", "stamps") DEFAULT "points"' },
    { name: 'secondary_color', type: 'VARCHAR(50) DEFAULT "#374151"' },
    { name: 'logo_text', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'card_title', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'card_subtitle', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'back_fields_info', type: 'TEXT DEFAULT NULL' },
    { name: 'back_fields_terms', type: 'TEXT DEFAULT NULL' },
    { name: 'back_fields_website', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'apple_organization_name', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'apple_pass_description', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'apple_background_color', type: 'VARCHAR(50) DEFAULT "#1f2937"' },
    { name: 'apple_text_color', type: 'VARCHAR(50) DEFAULT "#ffffff"' },
    { name: 'apple_label_color', type: 'VARCHAR(50) DEFAULT "#9ca3af"' },
    { name: 'apple_logo_url', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'apple_icon_url', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'apple_strip_image_url', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'latitude', type: 'DECIMAL(10, 8) DEFAULT NULL' },
    { name: 'longitude', type: 'DECIMAL(11, 8) DEFAULT NULL' },
    { name: 'relevant_text', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'google_primary_color', type: 'VARCHAR(50) DEFAULT "#1f2937"' },
    { name: 'google_text_color', type: 'VARCHAR(50) DEFAULT "#ffffff"' },
    { name: 'google_logo_url', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'google_hero_image_url', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'google_card_title', type: 'VARCHAR(255) DEFAULT "Programme Fidélité"' },
    { name: 'google_card_subtitle', type: 'VARCHAR(255) DEFAULT "Merci de votre fidélité"' },
    { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
  ];

  try {
    // 1. Vérifier les colonnes
    const [rows] = await pool.query('SHOW COLUMNS FROM card_customization');
    const existingColumnsMap = {};
    rows.forEach(r => { existingColumnsMap[r.Field] = r.Type.toUpperCase(); });
    
    for (const col of columnsToAdd) {
      if (!existingColumnsMap[col.name]) {
        console.log(`➕ Adding missing column: ${col.name}`);
        await pool.query(`ALTER TABLE card_customization ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // 2. Gérer l'index unique (doit être sur company_id ET loyalty_type)
    const [indexes] = await pool.query('SHOW INDEX FROM card_customization');
    const hasCompanyIdUnique = indexes.some(idx => idx.Key_name === 'company_id' && idx.Non_unique === 0 && !indexes.some(idx2 => idx2.Key_name === 'company_id' && idx2.Seq_in_index > 1));
    const hasCompositeUnique = indexes.some(idx => idx.Key_name === 'company_loyalty_uid');

    if (hasCompanyIdUnique) {
      console.log('⚠️ Removing old unique index on company_id (will replace with composite)');
      try { await pool.query('ALTER TABLE card_customization DROP INDEX company_id'); } catch (e) {}
    }

    if (!hasCompositeUnique) {
      console.log('➕ Creating composite unique index (company_id, loyalty_type)');
      await pool.query('ALTER TABLE card_customization ADD UNIQUE INDEX company_loyalty_uid (company_id, loyalty_type)');
    }
    
    console.log('🎉 Schema check completed successfully!');
  } catch (error) {
    console.error('❌ Error during schema verification:', error.message);
  } finally {
    process.exit();
  }
}

ensureSchema();
