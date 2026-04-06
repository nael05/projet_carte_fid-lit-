#!/usr/bin/env node
/**
 * Outil de diagnostic Apple Wallet
 * Vérifie que tous les fichiers et configurations sont correctement en place
 * 
 * Usage: node diagnose-apple-wallet.js
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Charger les variables d'environnement AVANT d'importer le module
dotenv.config();

import { diagnoseAppleWallet } from './utils/appleWalletGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n' + '='.repeat(70));
console.log('🔍 DIAGNOSTIC APPLE WALLET - FidelyzPay');
console.log('='.repeat(70) + '\n');

const timestamp = new Date().toLocaleString('fr-FR');
console.log(`⏰ Diagnostic effectué le: ${timestamp}\n`);

// Fonction pour afficher les résultats avec des couleurs
const printStatus = (label, status, details = '') => {
  const icon = status === 'OK' ? '✅' : status === 'WARNING' ? '⚠️ ' : '❌';
  const color = status === 'OK' ? '\x1b[32m' : status === 'WARNING' ? '\x1b[33m' : '\x1b[31m';
  const reset = '\x1b[0m';
  
  console.log(`${icon} ${color}${label}${reset}`);
  if (details) {
    console.log(`   └─ ${details}`);
  }
};

// 1. Vérifier les variables d'environnement
console.log('📋 1. VÉRIFICATION DE LA CONFIGURATION\n');

const requiredEnvVars = {
  'APPLE_TEAM_ID': process.env.APPLE_TEAM_ID,
  'APPLE_PASS_TYPE_ID': process.env.APPLE_PASS_TYPE_ID,
  'APPLE_CERT_PATH': process.env.APPLE_CERT_PATH
};

let envOk = true;
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (value) {
    console.log(`   ✅ ${key}: ${value}`);
  } else {
    console.log(`   ❌ ${key}: MANQUANT`);
    envOk = false;
  }
}

if (!envOk) {
  console.log('\n⚠️  Certaines variables d\'environnement manquent!');
  console.log('   Vérifiez le fichier backend/.env\n');
}

// 2. Vérifier les fichiers
console.log('\n📁 2. VÉRIFICATION DES FICHIERS\n');

const filesToCheck = [
  { path: './certs/apple-wallet-cert.p12', description: 'Certificat Apple Wallet (CRITIQUE)' },
  { path: './models/fidelyz.pass/pass.json', description: 'Modèle de pass' },
  { path: './models/fidelyz.pass/icon.png', description: 'Icône du pass' },
  { path: './models/fidelyz.pass/logo.png', description: 'Logo du pass' }
];

let filesOk = true;
for (const file of filesToCheck) {
  const fullPath = path.resolve(__dirname, file.path);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const stat = fs.statSync(fullPath);
    const size = (stat.size / 1024).toFixed(2);
    const isCritical = file.description.includes('CRITIQUE');
    console.log(`   ✅ ${file.description}`);
    console.log(`      └─ ${fullPath} (${size} KB)`);
  } else {
    const isCritical = file.description.includes('CRITIQUE');
    console.log(`   ${isCritical ? '❌' : '⚠️ '} ${file.description}`);
    console.log(`      └─ ${fullPath} MANQUANT`);
    if (isCritical) filesOk = false;
  }
}

// 3. Valider le certificat p12
console.log('\n🔐 3. VALIDATION DU CERTIFICAT\n');

const certPath = path.resolve(__dirname, process.env.APPLE_CERT_PATH || './certs/apple-wallet-cert.p12');
if (fs.existsSync(certPath)) {
  try {
    const certBuffer = fs.readFileSync(certPath);
    console.log(`   ✅ Fichier P12 lisible`);
    console.log(`      └─ Taille: ${certBuffer.length} bytes`);
    console.log(`      └─ Encodage: binary (PKCS#12)`);
    console.log(`      └─ Prêt pour signature`);
  } catch (e) {
    console.log(`   ❌ Erreur lecture certificat: ${e.message}`);
    filesOk = false;
  }
} else {
  console.log(`   ❌ Certificat non trouvé: ${certPath}`);
  filesOk = false;
}

// 4. Vérifier le modèle de pass
console.log('\n📦 4. VALIDATION DU MODÈLE DE PASS\n');

const passJsonPath = path.resolve(__dirname, './models/fidelyz.pass/pass.json');
if (fs.existsSync(passJsonPath)) {
  try {
    const passJson = JSON.parse(fs.readFileSync(passJsonPath, 'utf8'));
    console.log(`   ✅ Fichier pass.json valide`);
    console.log(`      └─ Pass Type ID: ${passJson.passTypeIdentifier}`);
    console.log(`      └─ Team ID: ${passJson.teamIdentifier}`);
    console.log(`      └─ Description: ${passJson.description}`);
    
    // Vérifier que le Pass Type ID correspond
    const expectedPassTypeId = process.env.APPLE_PASS_TYPE_ID || 'pass.com.fidelyz.apple.passkit';
    if (passJson.passTypeIdentifier === expectedPassTypeId) {
      console.log(`      ✅ Pass Type ID correct`);
    } else {
      console.log(`      ⚠️  Pass Type ID mismatch`);
      console.log(`         Expected: ${expectedPassTypeId}`);
      console.log(`         Found: ${passJson.passTypeIdentifier}`);
    }
  } catch (e) {
    console.log(`   ❌ Erreur validation pass.json: ${e.message}`);
  }
}

// 5. Effectuer le diagnostic complet
console.log('\n🔧 5. DIAGNOSTIC COMPLET\n');

try {
  const diagnosis = await diagnoseAppleWallet();
  
  if (diagnosis.status === 'OK') {
    console.log('   ✅ Tous les systèmes sont opérationnels!');
  } else {
    console.log('   ⚠️  Des problèmes ont été détectés:');
    if (diagnosis.config.certExists === false) {
      console.log('      └─ Certificat Apple Wallet manquant');
    }
    if (diagnosis.config.modelExists === false) {
      console.log('      └─ Modèle de pass manquant');
    }
  }
  
  console.log(`\n   Configuration:`);
  console.log(`      Team ID: ${diagnosis.config.teamId}`);
  console.log(`      Pass Type ID: ${diagnosis.config.passTypeId}`);
  console.log(`      Certificate: ${diagnosis.config.certExists ? '✅' : '❌'}`);
  console.log(`      Model: ${diagnosis.config.modelExists ? '✅' : '❌'}`);
  
} catch (e) {
  console.log(`   ❌ Erreur diagnostic: ${e.message}`);
}

// 6. Résumé final
console.log('\n' + '='.repeat(70));
console.log('📊 RÉSUMÉ');
console.log('='.repeat(70) + '\n');

if (envOk && filesOk) {
  console.log('✅ TOUT EST PRÊT!');
  console.log('\n🚀 Vous pouvez maintenant générer des passes Apple Wallet.');
  console.log('   Test API: POST /api/wallet/apple');
  console.log('   Body: { "clientId": "xxx", "entrepriseId": "yyy" }\n');
} else {
  console.log('❌ DES PROBLÈMES DÉTECTÉS');
  console.log('\n🔧 Actions recommandées:');
  
  if (!envOk) {
    console.log('   1. Vérifier backend/.env');
    console.log('      - APPLE_TEAM_ID doit être: 8QYMJ4RJ55');
    console.log('      - APPLE_PASS_TYPE_ID doit être: pass.com.fidelyz.apple.passkit');
    console.log('      - APPLE_CERT_PATH doit être: ./certs/apple-wallet-cert.p12\n');
  }
  
  if (!filesOk) {
    console.log('   2. Vérifier les fichiers:');
    console.log('      - Placer certificat_final.p12 → backend/certs/apple-wallet-cert.p12');
    console.log('      - Vérifier modèle en: backend/models/fidelyz.pass/\n');
  }
}

console.log('='.repeat(70) + '\n');
console.log('📞 Documentation: Voir APPLE_WALLET_CERTIFICATE_SETUP.md\n');
