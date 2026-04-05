import { randomUUID } from 'crypto';

const API_URL = 'http://localhost:5000/api';

async function apiCall(method, endpoint, data, token) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...(data && { body: JSON.stringify(data) })
  };

  const res = await fetch(url, options);
  const json = await res.json();
  
  if (!res.ok) {
    throw { status: res.status, data: json };
  }
  return json;
}

async function testFirstPasswordChange() {
  console.log('\n🧪 TEST: CHANGEMENT MOT DE PASSE PREMIÈRE CONNEXION\n');
  console.log('═'.repeat(60));

  try {
    // 1. Admin login
    console.log('\n1️⃣ Admin login...');
    const adminLogin = await apiCall('POST', '/admin/login', {
      identifiant: 'test_admin',
      mot_de_passe: 'test12345'
    });
    const adminToken = adminLogin.token;
    console.log('✅ Admin authentifié');

    // 2. Créer une entreprise de test
    console.log('\n2️⃣ Création entreprise de test...');
    const testEmail = `test-pwd-${randomUUID().substring(0, 8)}@test.com`;
    const createRes = await apiCall('POST', '/admin/create-company', {
      nom: 'Test Password Reset',
      email: testEmail,
      loyalty_type: 'points'
    }, adminToken);
    
    const companyId = createRes.companyId;
    const tempPassword = createRes.temporaryPassword;
    console.log(`✅ Entreprise créée: ${companyId}`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Mot de passe temporaire: ${tempPassword}`);

    // 3. Se connecter avec mot de passe temporaire
    console.log('\n3️⃣ Connexion avec mot de passe temporaire...');
    const proLogin = await apiCall('POST', '/pro/login', {
      email: testEmail,
      mot_de_passe: tempPassword
    });
    
    const proToken = proLogin.token;
    console.log(`✅ Connecté avec succès`);
    console.log(`   Token: ${proToken.substring(0, 20)}...`);
    console.log(`   mustChangePassword: ${proLogin.mustChangePassword}`);
    
    if (!proLogin.mustChangePassword) {
      console.log('❌ ERREUR: mustChangePassword devrait être TRUE!');
      process.exit(1);
    }

    // 4. Tenter de changer le mot de passe
    console.log('\n4️⃣ Changement du mot de passe...');
    const newPassword = 'NewPassword123!';
    const changeRes = await apiCall('PUT', '/pro/change-password', {
      newPassword
    }, proToken);
    console.log(`✅ Mot de passe changé: ${changeRes.message}`);

    // 5. Se reconnecter avec nouveau mot de passe
    console.log('\n5️⃣ Reconnexion avec nouveau mot de passe...');
    const proLogin2 = await apiCall('POST', '/pro/login', {
      email: testEmail,
      mot_de_passe: newPassword
    });
    
    console.log(`✅ Connecté avec le nouveau mot de passe`);
    console.log(`   mustChangePassword: ${proLogin2.mustChangePassword}`);
    
    if (proLogin2.mustChangePassword) {
      console.log('❌ ERREUR: mustChangePassword devrait être FALSE!');
      process.exit(1);
    }

    // 6. Vérifier que mot de passe temporaire ne fonctionne plus
    console.log('\n6️⃣ Vérification: mot de passe temporaire ne fonctionne plus...');
    try {
      await apiCall('POST', '/pro/login', {
        email: testEmail,
        mot_de_passe: tempPassword
      });
      console.log('❌ ERREUR: Le mot de passe temporaire ne devrait plus fonctionner!');
      process.exit(1);
    } catch (err) {
      if (err.status === 401) {
        console.log('✅ Mot de passe temporaire rejeté correctement');
      } else {
        throw err;
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TOUS LES TESTS RÉUSSIS!\n');
    console.log('Flux validé:');
    console.log('  1. ✅ Création: must_change_password = TRUE');
    console.log('  2. ✅ Connexion avec code temporaire');
    console.log('  3. ✅ Changement de mot de passe enregistré');
    console.log('  4. ✅ Flag must_change_password = FALSE');
    console.log('  5. ✅ Nouveau mot de passe fonctionne');
    console.log('  6. ✅ Ancien code temporaire invalide\n');

  } catch (err) {
    console.error('\n❌ ERREUR:', err.data || err.message);
    console.error('\nDétails:', err);
    process.exit(1);
  }
}

testFirstPasswordChange();
