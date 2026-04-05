import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createIssuerWithGoogleAuth() {
  log('\n' + '='.repeat(80), 'blue');
  log('🎫 CRÉATION D\'ISSUER AVEC GOOGLE AUTH LIBRARY', 'blue');
  log('='.repeat(80) + '\n', 'blue');

  try {
    const credentialsPath = './certs/google-wallet-key.json';
    
    log('📝 Initialisation Google Auth...', 'cyan');
    
    // Lire les credentials
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // Créer une instance GoogleAuth
    const auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: [
        'https://www.googleapis.com/auth/walletobjects',
        'https://www.googleapis.com/auth/wallet_objects.issuer'
      ]
    });

    log('✅ GoogleAuth initialisé', 'green');
    log(`   Service Account: ${credentials.client_email}`, 'yellow');
    log(`   Project: ${credentials.project_id}\n`, 'yellow');

    // Obtenir le client authentifié
    log('🔐 Obtention du token d\'accès...', 'cyan');
    const client = await auth.getClient();
    log('✅ Client authentifié', 'green');

    // Récupérer le token
    const { token } = await client.getAccessToken();
    log(`✅ Token d'accès obtenu (${token.substring(0, 50)}...)\n`, 'green');

    // Créer l'Issuer
    log('🏢 Création de l\'Issuer...', 'cyan');
    
    const issuerId = credentials.client_email.split('@')[0]; // ex: fidelite-saas-531
    
    const issuerData = {
      issuerName: 'SaaS Fidelité',
      issuerId: issuerId
    };

    log(`   Issuer ID: ${issuerId}`, 'yellow');
    log(`   Nom: SaaS Fidelité\n`, 'yellow');

    const response = await fetch(
      'https://walletobjects.googleapis.com/walletobjects/v1/issuer',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(issuerData)
      }
    );

    const responseData = await response.json();

    if (response.ok) {
      log('✅ ISSUER CRÉÉ AVEC SUCCÈS!', 'green');
      log(`\n   ID: ${responseData.issuerId}`, 'green');
      log(`   Nom: ${responseData.issuerName}\n`, 'green');
    } else if (response.status === 409) {
      log('✅ ISSUER EXISTE DÉJÀ (c\'est bon!)', 'yellow');
      log(`\n   ID: ${issuerId}`, 'green');
      log(`   Status: Prêt à générer des passes!\n`, 'green');
    } else {
      log(`❌ Erreur (${response.status}): ${response.statusText}`, 'red');
      log(`   Détails: ${JSON.stringify(responseData)}`, 'red');
      return;
    }

    // Résumé
    log('='.repeat(80), 'blue');
    log('✅ CONFIGURATION GOOGLE WALLET COMPLÈTE!', 'green');
    log('='.repeat(80), 'blue');
    log(`\nL'Issuer est prêt. Les clients peuvent maintenant:`, 'green');
    log('   ✅ Générer des cartes de loyauté', 'green');
    log('   ✅ Les ajouter à Google Wallet sur Android', 'green');
    log(`\nProchaine étape: Relancer le backend`, 'yellow');
    log(`Commande: npm start\n`, 'yellow');

  } catch (error) {
    log(`\n❌ Erreur: ${error.message}`, 'red');
    log('Stack:', 'red');
    log(error.stack, 'red');
  }
}

createIssuerWithGoogleAuth();
