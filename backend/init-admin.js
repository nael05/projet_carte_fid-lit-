import mysql from 'mysql2/promise.js';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const initDatabase = async () => {
  try {
    // Configuration - Utiliser le mot de passe depuis .env ou générer un aléatoire
    const masterPassword = process.env.ADMIN_PASSWORD || (Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10));
    const adminId = uuidv4();
    const passwordHash = await bcryptjs.hash(masterPassword, 10);

    // 1. Connexion à la base loyalty_saas
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

    // 2. Vérifier si un master admin existe
    const [existingAdmins] = await connection.query(
      'SELECT COUNT(*) as count FROM super_admins'
    );

    if (existingAdmins[0].count > 0) {
      console.log('✅ Master admin déjà existant');
      console.log('');
      console.log('🔐 Identifiants existants:');
      console.log('   Identifiant: master_admin');
      const [admins] = await connection.query('SELECT * FROM super_admins LIMIT 1');
      console.log('   ID:', admins[0].id);
      connection.release();
      pool.end();
      return;
    }

    // 3. Créer le master admin
    console.log('📝 Création du master admin...');
    await connection.query(
      'INSERT INTO super_admins (id, identifiant, mot_de_passe) VALUES (?, ?, ?)',
      [adminId, 'master_admin', passwordHash]
    );

    console.log('✅ Master admin créé avec succès !');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 IDENTIFIANTS DE CONNEXION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📍 URL: http://localhost:3000/master-admin-secret');
    console.log('');
    console.log('Identifiant: master_admin');
    console.log('Mot de passe: ' + masterPassword);
    console.log('');
    console.log('ID Admin: ' + adminId);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✨ Allez à http://localhost:3000 pour commencer !');
    console.log('');

    // 4. Vérifier les tables
    const [tables] = await connection.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "loyalty_saas"'
    );
    console.log('📊 Tables créées:');
    tables.forEach(t => console.log('   ✓', t.TABLE_NAME));
    console.log('');

    connection.release();
    pool.end();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('');
    console.error('💡 Assurez-vous que:');
    console.error('   1. MySQL est démarré (WAMP/XAMPP)');
    console.error('   2. La base de données "loyalty_saas" existe');
    console.error('   3. Vous avez exécuté: mysql -u root -p < schema.sql');
    process.exit(1);
  }
};

initDatabase();
