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

async function checkGoogleWalletAPI() {
  log('\n' + '='.repeat(80), 'blue');
  log('✅ CHECKLIST GOOGLE WALLET API', 'blue');
  log('='.repeat(80) + '\n', 'blue');

  try {
    const credentials = JSON.parse(fs.readFileSync('./certs/google-wallet-key.json', 'utf8'));
    
    log('📋 Étapes à vérifier dans Google Cloud Console:\n', 'cyan');
    
    log('1️⃣  VÉRIFIER Google Wallet API est ACTIVÉE:', 'yellow');
    log('   => Allez sur: https://console.cloud.google.com/', 'reset');
    log(`   => Projet: ${credentials.project_id}`, 'reset');
    log('   => Menu ☰ → APIs et services → Bibliothèque', 'reset');
    log('   => Cherchez: "Google Wallet API"', 'reset');
    log('   => Cliquez et vérifiez: "ACTIVÉE" (pas "Activer")', 'reset');
    log('   => Status: ???\n', 'red');

    log('2️⃣  VÉRIFIER les permissions:', 'yellow');
    log('   => Menu ☰ → Contrôle d\'accès (IAM)', 'reset');
    log(`   => Service Account: ${credentials.client_email}`, 'reset');
    log('   => Rôle: "Propriétaire" (tu dis que c\'est OK)', 'reset');
    log('   => Status: ✅ (Tu as dit que c\'est bon)\n', 'green');

    log('3️⃣  CRÉER UN ISSUER après:', 'yellow');
    log('   => Une fois l\'API activée', 'reset');
    log('   => Je peux créer l\'Issuer automatiquement', 'reset');
    log('   => Avec: node create-google-wallet-issuer.js\n', 'reset');

    log('='.repeat(80), 'blue');
    log('⚠️  LE PROBLÈME:', 'red');
    log('='.repeat(80), 'blue');
    log('\nLa Google Wallet API n\'est probablement PAS activée.', 'yellow');
    log('Je viens de tester et ça dit: "Invalid scope"', 'yellow');
    log('Cela signifie qu\'on n\'a pas accès à l\'API encore.\n', 'yellow');

    log('='.repeat(80), 'blue');
    log('✅ SOLUTION:', 'green');
    log('='.repeat(80), 'blue');
    log('\n1. Va vérifier que Google Wallet API est ACTIVÉE', 'yellow');
    log('2. Attends 2-3 minutes pour que ça se propage', 'yellow');
    log('3. Relance ce script: node create-google-wallet-issuer.js\n', 'yellow');

  } catch (error) {
    log(`\n❌ Erreur: ${error.message}`, 'red');
  }
}

checkGoogleWalletAPI();
