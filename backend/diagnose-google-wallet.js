#!/usr/bin/env node
/**
 * Script de diagnostic Google Wallet
 * Vérifie la configuration des credentials Google
 */

import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

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

async function diagnoseGoogleWallet() {
  log('\n' + '='.repeat(80), 'blue');
  log('🔍 DIAGNOSTIC GOOGLE WALLET', 'blue');
  log('='.repeat(80) + '\n', 'blue');

  try {
    // ===== TEST 1: Vérifier fichier credentials =====
    log('1️⃣  Vérification du fichier credentials...', 'cyan');
    
    const credPath = './certs/google-wallet-key.json';
    if (!fs.existsSync(credPath)) {
      log('   ❌ Fichier non trouvé: ' + credPath, 'red');
      return;
    }
    
    const credContent = fs.readFileSync(credPath, 'utf8');
    let credentials;
    
    try {
      credentials = JSON.parse(credContent);
      log('   ✅ Fichier est valide JSON', 'green');
    } catch (e) {
      log(`   ❌ JSON invalide: ${e.message}`, 'red');
      return;
    }

    // ===== TEST 2: Vérifier les champs requis =====
    log('\n2️⃣  Vérification des champs Service Account...', 'cyan');
    
    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
      'auth_uri',
      'token_uri',
      'auth_provider_x509_cert_url'
    ];
    
    let allFieldsPresent = true;
    requiredFields.forEach(field => {
      if (credentials[field]) {
        log(`   ✅ ${field}`, 'green');
      } else {
        log(`   ❌ ${field} manquant`, 'red');
        allFieldsPresent = false;
      }
    });
    
    if (!allFieldsPresent) {
      log('\n   ⚠️  Des champs obligatoires sont manquants!', 'red');
      return;
    }

    // ===== TEST 3: Vérifier la clé privée =====
    log('\n3️⃣  Vérification de la clé privée...', 'cyan');
    
    if (credentials.private_key.includes('BEGIN PRIVATE KEY') && 
        credentials.private_key.includes('END PRIVATE KEY')) {
      log('   ✅ Format PEM valide', 'green');
    } else {
      log('   ❌ Format PEM invalide', 'red');
      return;
    }

    // ===== TEST 4: Vérifier les clés x509 =====
    log('\n4️⃣  Vérification des certificats x509...', 'cyan');
    
    if (credentials.client_x509_cert_url) {
      log(`   ✅ Certificat URL présent: ${credentials.client_x509_cert_url}`, 'green');
    } else {
      log('   ⚠️  Certificat URL manquant', 'yellow');
    }

    // ===== TEST 5: Infos du projet =====
    log('\n5️⃣  Infos du projet Google Cloud...', 'cyan');
    log(`   📋 Projet ID: ${credentials.project_id}`, 'yellow');
    log(`   📧 Service Account: ${credentials.client_email}`, 'yellow');
    log(`   🔑 Private Key ID: ${credentials.private_key_id}`, 'yellow');
    log(`   🌐 Token URI: ${credentials.token_uri}`, 'yellow');

    // ===== TEST 6: Tester génération JWT =====
    log('\n6️⃣  Test de génération JWT...', 'cyan');
    
    try {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/wallet_objects.issuer',
        aud: credentials.token_uri,
        exp: now + 3600,
        iat: now
      };

      const token = jwt.sign(payload, credentials.private_key, {
        algorithm: 'RS256'
      });

      log('   ✅ JWT généré avec succès', 'green');
      log(`   📝 Token (premiers 50 chars): ${token.substring(0, 50)}...`, 'yellow');
    } catch (e) {
      log(`   ❌ Erreur génération JWT: ${e.message}`, 'red');
      return;
    }

    // ===== TEST 7: Informations pour configuration =====
    log('\n7️⃣  Checklist Google Cloud Console...', 'cyan');
    log('\n   À vérifier dans https://console.cloud.google.com/', 'yellow');
    log('   ', 'reset');
    log('   1. ✋ Allez sur https://console.cloud.google.com/', 'reset');
    log(`   2. ✋ Sélectionnez le projet: ${credentials.project_id}`, 'reset');
    log('   3. ✋ Menu > APIs & Services > Enabled APIs & services', 'reset');
    log('   4. ✋ Recherchez "Google Wallet API"', 'reset');
    log('   5. ✋ Si non activée, cliquez "Enable"', 'reset');
    log('   6. ✋ Menu > APIs & Services > Service Accounts', 'reset');
    log(`   7. ✋ Cliquez sur: ${credentials.client_email}`, 'reset');
    log('   8. ✋ Onglet "Roles" - Vérifiez que le role est assigné:', 'reset');
    log('      - Wallet Objects Admin OU', 'reset');
    log('      - Editor OU', 'reset');
    log('      - Owner', 'reset');
    log('   9. ✋ Configurez l\'issuer dans Google Wallet Console:', 'reset');
    log('      https://pay.google.com/gp/m/issuer', 'reset');

    // ===== RÉSUMÉ =====
    log('\n' + '='.repeat(80), 'blue');
    log('✅ DIAGNOSTIC COMPLET: Vos credentials Google sont VALIDES!', 'green');
    log('='.repeat(80), 'blue');
    log('\n⚠️  Si la génération échoue encore, le problème est dans Google Cloud:', 'yellow');
    log('   - L\'API n\'est pas activée', 'reset');
    log('   - Le Service Account n\'a pas assez de permissions', 'reset');
    log('   - L\'Issuer n\'est pas configuré dans Google Wallet Console', 'reset');

  } catch (error) {
    log(`\n❌ Erreur: ${error.message}`, 'red');
  }
}

diagnoseGoogleWallet();
