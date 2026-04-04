import mysql from 'mysql2/promise.js';

const testConnection = async () => {
  console.log('🔍 Test de connexion MySQL...');
  console.log('');

  const configs = [
    { host: 'localhost', port: 3306, name: 'localhost:3306 (par défaut)' },
    { host: '127.0.0.1', port: 3306, name: '127.0.0.1:3306' },
  ];

  for (const config of configs) {
    try {
      console.log(`\nTestage: ${config.name}`);
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: 'root',
        password: '',
        database: 'loyalty_saas'
      });
      
      console.log('✅ Connexion réussie !');
      connection.end();
      return true;
    } catch (error) {
      console.log(`❌ Échec: ${error.code || error.message}`);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ Impossible de se connecter à MySQL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📋 Checklist:');
  console.log('');
  console.log('1️⃣  Démarrer WAMP/XAMPP');
  console.log('   - Ouvrir le tableau de bord WAMP');
  console.log('   - Vérifier que MySQL est "green" (en cours d\'exécution)');
  console.log('');
  console.log('2️⃣  Créer la base de données');
  console.log('   - Aller sur http://localhost/phpmyadmin');
  console.log('   - Créer une base nommée "loyalty_saas"');
  console.log('   - Importer schema.sql:');
  console.log('     * Sélectionner l\'onglet "Importer"');
  console.log('     * Choisir schema.sql');
  console.log('     * Cliquer "Go"');
  console.log('');
  console.log('3️⃣  Réessayer après');
  console.log('   - Relancer ce script');
  console.log('');
  process.exit(1);
};

testConnection();
