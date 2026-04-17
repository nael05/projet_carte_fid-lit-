import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

async function test() {
  console.log('--- TEST API BREVO (HTTP) ---');
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Erreur : BREVO_API_KEY manquante dans le .env');
    return;
  }

  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: 'Fidelyz', email: 'nael80393@gmail.com' },
      to: [{ email: 'nael.mrl@icloud.com' }],
      subject: 'Test API Brevo Fidelyz',
      textContent: 'Si vous voyez ce message, l\'API Brevo fonctionne parfaitement !'
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ TEST RÉUSSI !');
    console.log('Réponse de Brevo :', response.data);
    console.log('\n💡 L\'API fonctionne. Je vais modifier Fidelyz pour utiliser cette méthode.');
  } catch (err) {
    console.error('❌ ÉCHEC DU TEST API :');
    if (err.response) {
      console.error('Erreur Brevo :', err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

test();
