#!/usr/bin/env node
/**
 * Script pour réinitialiser le mot de passe du master admin
 */

import mysql from 'mysql2/promise.js';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const resetAdminPassword = async () => {
  try {
    const newPassword = 'Master@dmin123';
    const passwordHash = await bcryptjs.hash(newPassword, 10);

    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'loyalty_saas',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('🔗 Connexion à MySQL...');
    const connection = await pool.getConnection();

    console.log('📝 Réinitialisation du mot de passe master admin...');
    await connection.query(
      'UPDATE super_admins SET mot_de_passe = ? WHERE identifiant = ?',
      [passwordHash, 'master_admin']
    );

    console.log('\n✅ Mot de passe réinitialisé avec succès\n');
    console.log('🔐 IDENTIFIANTS DE CONNEXION');
    console.log('━'.repeat(40));
    console.log('Identifiant: master_admin');
    console.log(`Mot de passe: ${newPassword}`);
    console.log('━'.repeat(40));

    connection.release();
    pool.end();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
};

resetAdminPassword();
