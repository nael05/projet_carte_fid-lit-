import pool from './db.js';

async function fixDatabase() {
  try {
    console.log('🔍 Vérification de la structure de la table entreprises...\n');
    
    // Vérifier les colonnes existantes
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'projet_carte_fidelite' AND TABLE_NAME = 'entreprises'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Colonnes actuelles:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (NULL: ${col.IS_NULLABLE})`);
    });
    
    const columnNames = columns.map(c => c.COLUMN_NAME);
    const missingColumns = [];
    
    // Vérifier les colonnes manquantes
    if (!columnNames.includes('temporary_password')) {
      missingColumns.push('temporary_password');
      console.log('\n⚠️  Colonne manquante: temporary_password');
    }
    
    if (!columnNames.includes('must_change_password')) {
      missingColumns.push('must_change_password');
      console.log('⚠️  Colonne manquante: must_change_password');
    }
    
    if (!columnNames.includes('loyalty_type')) {
      missingColumns.push('loyalty_type');
      console.log('⚠️  Colonne manquante: loyalty_type');
    }
    
    // Ajouter les colonnes manquantes
    if (missingColumns.length > 0) {
      console.log('\n📝 Ajout des colonnes manquantes...\n');
      
      for (const col of missingColumns) {
        try {
          if (col === 'temporary_password') {
            await pool.query(`
              ALTER TABLE entreprises 
              ADD COLUMN temporary_password VARCHAR(255) NULL 
              AFTER mot_de_passe
            `);
            console.log('✅ Colonne temporary_password ajoutée');
          } else if (col === 'must_change_password') {
            await pool.query(`
              ALTER TABLE entreprises 
              ADD COLUMN must_change_password BOOLEAN DEFAULT TRUE 
              AFTER temporary_password
            `);
            console.log('✅ Colonne must_change_password ajoutée');
          } else if (col === 'loyalty_type') {
            await pool.query(`
              ALTER TABLE entreprises 
              ADD COLUMN loyalty_type ENUM('points', 'stamps') DEFAULT 'points' 
              AFTER statut
            `);
            console.log('✅ Colonne loyalty_type ajoutée');
          }
        } catch (err) {
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.log(`ℹ️  Colonne ${col} existe déjà`);
          } else {
            console.log(`❌ Erreur en ajoutant ${col}: ${err.message}`);
          }
        }
      }
    } else {
      console.log('\n✅ Toutes les colonnes requises existent!');
    }
    
    // Vérifier les colonnes finales
    console.log('\n🔍 Vérification finale...\n');
    const [finalColumns] = await pool.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'projet_carte_fidelite' AND TABLE_NAME = 'entreprises'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('✅ Structure finale:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
    });
    
    console.log('\n✅ Base de données corrigée avec succès!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

fixDatabase();
