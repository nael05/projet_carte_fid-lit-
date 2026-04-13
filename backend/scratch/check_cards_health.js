import pool from '../db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkHealth() {
  console.log('🔍 Diagnostic de santé des cartes Wallet...');
  console.log('-----------------------------------------');

  try {
    // 1. Statistiques Globales
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN pass_serial_number LIKE 'GOOGLE_%' THEN 1 ELSE 0 END) as google_cards,
        SUM(CASE WHEN pass_serial_number NOT LIKE 'GOOGLE_%' THEN 1 ELSE 0 END) as apple_cards
      FROM wallet_cards
    `);
    console.log(`📊 Total cartes : ${stats[0].total}`);
    console.log(`🍏 Apple : ${stats[0].apple_cards}`);
    console.log(`🤖 Google : ${stats[0].google_cards}`);

    // 2. Vérification Apple Registrations (Appareils qui écoutent)
    const [registrations] = await pool.query(`
      SELECT COUNT(*) as registered_devices FROM apple_pass_registrations
    `);
    console.log(`📱 Appareils Apple enregistrés : ${registrations[0].registered_devices}`);

    // 3. Identification des cartes Apple SANS enregistrement (Orphelines)
    const [orphans] = await pool.query(`
      SELECT wc.pass_serial_number, c.email 
      FROM wallet_cards wc
      JOIN clients c ON wc.client_id = c.id
      LEFT JOIN apple_pass_registrations apr ON wc.pass_serial_number = apr.pass_serial_number
      WHERE wc.pass_serial_number NOT LIKE 'GOOGLE_%' AND apr.id IS NULL
      LIMIT 5
    `);
    
    if (orphans.length > 0) {
      console.log(`\n⚠️  Cartes Apple orphelines (pas d'appareil enregistré) : ${orphans.length} trouvées.`);
      console.log('   Note : Cela signifie que le téléphone n\'a jamais contacté le serveur de prod.');
    } else {
      console.log(`\n✅ Toutes les cartes Apple ont au moins un appareil enregistré.`);
    }

    // 4. Vérification Google Issuer ID
    const currentIssuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    console.log(`\n🔑 Google Issuer ID actuel : ${currentIssuerId}`);
    
    const [googleSample] = await pool.query(`
      SELECT pass_serial_number FROM wallet_cards 
      WHERE pass_serial_number LIKE 'GOOGLE_%' 
      LIMIT 1
    `);

    if (googleSample.length > 0) {
      console.log(`   Exemple ID Google en base : ${googleSample[0].pass_serial_number}`);
    }

    console.log('\n-----------------------------------------');
    console.log('💡 CONSEIL : Si une carte Apple est orpheline, le client DOIT la rajouter.');
    console.log('   Si les points ne montent pas, vérifiez si l\'adresse dans la carte Apple (dos) est correcte.');

  } catch (err) {
    console.error('❌ Erreur diagnostic :', err.message);
  } finally {
    process.exit();
  }
}

checkHealth();
