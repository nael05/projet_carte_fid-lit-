import mysql from 'mysql2/promise.js';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const resetAdmin = async () => {
  try {
    console.log('🔑 Suppression de l\'ancien master admin...');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'loyalty_saas'
    });

    // Supprimer l'ancien
    try {
      await connection.query('DELETE FROM super_admins WHERE identifiant = ?', ['master_admin']);
      console.log('✅ Ancien admin supprimé');
    } catch (error) {
      console.log('ℹ️ Aucun admin existant');
    }

    console.log('');
    console.log('📝 Création du nouveau master admin...');

    // Créer le nouveau
    const masterPassword = 'AdminPassword123!';
    const adminId = uuidv4();
    const passwordHash = await bcryptjs.hash(masterPassword, 10);

    await connection.query(
      'INSERT INTO super_admins (id, identifiant, mot_de_passe) VALUES (?, ?, ?)',
      [adminId, 'master_admin', passwordHash]
    );

    console.log('✅ Master admin créé !');
    console.log('');

    await connection.end();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 INITIALISATION COMPLÈTE !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🔐 IDENTIFIANTS DE CONNEXION');
    console.log('');
    console.log('📍 URL: http://localhost:3000/master-admin-secret');
    console.log('');
    console.log('   Identifiant: master_admin');
    console.log('   Mot de passe: ' + masterPassword);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✨ Allez sur http://localhost:3000 pour commencer !');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

resetAdmin();
