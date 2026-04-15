
import db from './db.js';

async function testRegistration() {
  console.log('🧪 Test d\'enregistrement fictif...');
  
  const fakeSerial = 'SERIAL_TEST_' + Date.now();
  const fakeToken = 'TOKEN_TEST_' + Date.now();
  const deviceId = 'DEVICE_TEST_' + Date.now();
  
  try {
    // 1. Créer un pass fictif pour que l'enregistrement soit accepté
    await db.query(`
      INSERT INTO wallet_cards (client_id, company_id, pass_serial_number, authentication_token, points_balance, qr_code_value)
      VALUES (?, ?, ?, ?, ?, ?)`,
      ['clientId-test', 'companyId-test', fakeSerial, 'token-test', 10, 'qr-test']
    );
    console.log('✅ Pass de test créé');

    // 2. Simuler l'enregistrement (comme si l'iPhone appelait le serveur)
    await db.query(`
      INSERT INTO apple_pass_registrations (
        pass_serial_number, device_library_identifier, push_token, pass_type_identifier
      ) VALUES (?, ?, ?, ?)`,
      [fakeSerial, deviceId, fakeToken, 'pass.com.fidelyz.apple.passkit']
    );
    console.log('✅ Enregistrement réussi dans la table apple_pass_registrations');

    // 3. Vérifier le compte
    const [rows] = await db.query('SELECT COUNT(*) as count FROM apple_pass_registrations');
    console.log(`📊 Nouveau total d'enregistrements : ${rows[0].count}`);

    // Nettoyage rapide
    await db.query('DELETE FROM apple_pass_registrations WHERE pass_serial_number = ?', [fakeSerial]);
    await db.query('DELETE FROM wallet_cards WHERE pass_serial_number = ?', [fakeSerial]);
    console.log('🧹 Nettoyage terminé');

  } catch (err) {
    console.error('❌ ERREUR TEST REGISTRATION :', err.message);
  } finally {
    process.exit();
  }
}

testRegistration();
