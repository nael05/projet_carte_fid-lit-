import mysql from 'mysql2/promise.js';
import * as fs from 'fs';
import * as path from 'path';

const initDB = async () => {
  try {
    console.log('🔗 Étape 1: Connexion à MySQL...');
    
    // Connexion sans base de données d'abord
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
    });

    console.log('✅ Connecté à MySQL');
    console.log('');

    // Créer la base de données
    console.log('📝 Étape 2: Création de la base "loyalty_saas"...');
    try {
      await connection.query('CREATE DATABASE IF NOT EXISTS loyalty_saas');
      console.log('✅ Base créée (ou déjà existante)');
    } catch (error) {
      if (error.code !== 'ER_DB_CREATE_EXISTS') {
        throw error;
      }
    }
    
    console.log('');

    // Sélectionner la base
    console.log('📝 Étape 3: Sélection de la base...');
    await connection.query('USE loyalty_saas');
    console.log('✅ Base sélectionnée');
    console.log('');

    // Lire et exécuter le schema.sql
    console.log('📝 Étape 4: Import du schéma SQL...');
    const schemaPath = path.join(process.cwd(), '..', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Fichier schema.sql non trouvé: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        // Ignorer les erreurs de table déjà existante
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    console.log('✅ Schéma importé');
    console.log('');

    // Vérifier les tables
    console.log('📊 Étape 5: Vérification des tables...');
    const [tables] = await connection.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "loyalty_saas"'
    );
    
    console.log(`✅ ${tables.length} tables créées:`);
    tables.forEach(t => console.log(`   ✓ ${t.TABLE_NAME}`));
    console.log('');

    await connection.end();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Base de données initialisée avec succès !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Prochaine étape:');
    console.log('');
    console.log('  node init-admin.js');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('');
    console.error('💡 Vérifications:');
    console.error('   - MySQL est bien lancé (WAMP vert)?');
    console.error('   - Vous êtes dans le dossier backend/');
    console.error('   - schema.sql existe au niveau du projet?');
    process.exit(1);
  }
};

initDB();
