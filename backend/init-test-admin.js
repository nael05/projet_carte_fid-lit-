import pool from './db.js';
import bcrypt from 'bcryptjs';

async function initTestAdmin() {
  try {
    const identifiant = 'test_admin';
    const plainPassword = 'test12345';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    console.log('📝 Initializing test admin...');
    console.log('  Identifiant:', identifiant);
    console.log('  Password:', plainPassword);
    
    // Delete existing test admin if any
    await pool.query('DELETE FROM super_admins WHERE identifiant = ?', [identifiant]);
    
    // Insert new test admin
    await pool.query(
      'INSERT INTO super_admins (identifiant, mot_de_passe) VALUES (?, ?)',
      [identifiant, hashedPassword]
    );

    console.log('✅ Test admin created successfully');
    console.log('\n📌 Use these credentials for testing:');
    console.log('   identifiant: ' + identifiant);
    console.log('   mot_de_passe: ' + plainPassword);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

initTestAdmin();
