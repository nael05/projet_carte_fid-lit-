import pool from './backend/db.js';

async function addColumnIfMissing(table, column, definition) {
  const [columns] = await pool.query(`SHOW COLUMNS FROM ${table}`);
  if (!columns.some(c => c.Field === column)) {
    console.log(`📡 Ajout de la colonne "${column}" dans la table "${table}"...`);
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } else {
    console.log(`✅ La colonne "${column}" existe déjà dans "${table}".`);
  }
}

async function repair() {
  try {
    console.log('🚀 Début de la réparation intelligente...');
    
    await addColumnIfMissing('entreprises', 'loyalty_type', "ENUM('points', 'stamps') DEFAULT 'points'");
    await addColumnIfMissing('wallet_cards', 'authentication_token', "VARCHAR(255)");
    await addColumnIfMissing('wallet_cards', 'points_balance', "INT DEFAULT 0");
    await addColumnIfMissing('loyalty_config', 'loyalty_type', "ENUM('points', 'stamps') DEFAULT 'points'");

    console.log('✨ RÉPARATION TERMINÉE AVEC SUCCÈS !');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERREUR :', err.message);
    process.exit(1);
  }
}

repair();
