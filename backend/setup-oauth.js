#!/usr/bin/env node

/**
 * Script pour authentifier avec Google Wallet via ton compte Gmail personnel
 * Cela permettra au serveur de générer les cartes sans problèmes de permissions
 */

import { authenticate } from './utils/googleOAuth.js';

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  🔐 AUTHENTIFICATION GOOGLE WALLET (OAuth Personnel)   ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('Cette procédure va:');
console.log('  1️⃣  Ouvrir une page d\'authentification Google');
console.log('  2️⃣  Tu acceptes les permissions');
console.log('  3️⃣  Un token OAuth sera sauvegardé');
console.log('  4️⃣  Tes cartes Google Wallet vont fonctionner!\n');

console.log('⚠️  Important:');
console.log('  • Utilise ton compte Gmail personnel');
console.log('  • C\'est le compte qui gère ton Issuer Google Wallet');
console.log('  • Le Issuer ID: 3388000000023110060\n');

await authenticate();
