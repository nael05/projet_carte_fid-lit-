import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function testAuth() {
  const keyPath = process.env.GOOGLE_WALLET_KEY_PATH || './certs/google-wallet-key.json';
  const resolvedPath = path.resolve(keyPath);
  
  console.log(`🔍 Test de connexion avec la clé : ${resolvedPath}`);
  
  try {
    const auth = new GoogleAuth({
      keyFilename: resolvedPath,
      scopes: 'https://www.googleapis.com/auth/wallet_object.issuer',
    });
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    if (token && token.token) {
      console.log('✅ Succès ! Authentification réussie auprès de Google.');
      console.log('Token généré avec succès.');
    } else {
      console.log('❌ Échec : Aucun token n\'a pu être généré.');
    }
  } catch (err) {
    console.error('❌ Erreur lors de l\'authentification :');
    console.error(err.message);
    if (err.message.includes('ENOENT')) {
      console.error('Le fichier est introuvable au chemin spécifié.');
    }
  }
}

testAuth();
