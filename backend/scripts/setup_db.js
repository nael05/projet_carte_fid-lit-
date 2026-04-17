import pool from '../db.js';

async function setup() {
  try {
    console.log('⏳ Création de la table password_resets...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(191) NOT NULL,
        token VARCHAR(191) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        INDEX (token)
      )
    `);
    console.log('✅ Table password_resets créée avec succès !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de la création de la table :', err.message);
    process.exit(1);
  }
}

setup();
