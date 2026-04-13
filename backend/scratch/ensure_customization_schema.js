import pool from '../db.js';

async function ensureSchema() {
  console.log('🚀 Checking card_customization schema...');
  
  const columnsToAdd = [
    { name: 'secondary_color', type: 'VARCHAR(50) DEFAULT "#374151"' },
    { name: 'logo_text', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'card_title', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'card_subtitle', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'back_fields_info', type: 'TEXT DEFAULT NULL' },
    { name: 'back_fields_terms', type: 'TEXT DEFAULT NULL' },
    { name: 'back_fields_website', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'apple_organization_name', type: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'apple_pass_description', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'apple_background_color', type: 'VARCHAR(50) DEFAULT "#1f2937"' },
    { name: 'apple_text_color', type: 'VARCHAR(50) DEFAULT "#ffffff"' },
    { name: 'apple_label_color', type: 'VARCHAR(50) DEFAULT "#9ca3af"' },
    { name: 'apple_logo_url', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'apple_icon_url', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'apple_strip_image_url', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'latitude', type: 'DOUBLE DEFAULT NULL' },
    { name: 'longitude', type: 'DOUBLE DEFAULT NULL' },
    { name: 'relevant_text', type: 'VARCHAR(255) DEFAULT NULL' },
    { name: 'google_primary_color', type: 'VARCHAR(50) DEFAULT "#1f2937"' },
    { name: 'google_text_color', type: 'VARCHAR(50) DEFAULT "#ffffff"' },
    { name: 'google_logo_url', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'google_hero_image_url', type: 'VARCHAR(1000) DEFAULT NULL' },
    { name: 'google_card_title', type: 'VARCHAR(255) DEFAULT "Programme Fidélité"' },
    { name: 'google_card_subtitle', type: 'VARCHAR(255) DEFAULT "Merci de votre fidélité"' }
  ];

  try {
    const [rows] = await pool.query('SHOW COLUMNS FROM card_customization');
    const existingColumns = rows.map(r => r.Field);
    
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`➕ Adding missing column: ${col.name}`);
        await pool.query(`ALTER TABLE card_customization ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`✅ Column ${col.name} already exists.`);
      }
    }
    
    console.log('🎉 Schema check completed successfully!');
  } catch (error) {
    console.error('❌ Error during schema verification:', error.message);
  } finally {
    process.exit();
  }
}

ensureSchema();
