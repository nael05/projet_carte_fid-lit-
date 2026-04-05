import fs from 'fs';
import jwt from 'jsonwebtoken';
import http from 'http';
import { URL } from 'url';

/**
 * Solution OAuth pour Google Wallet
 * Utilise le compte Gmail personnel au lieu d'une Service Account
 * Cela contourne les problèmes de permissions Issuer
 */

const credentials = JSON.parse(fs.readFileSync('./certs/google-wallet-key.json', 'utf8'));

// Configuration OAuth (pour compte utilisateur personnel)
const OAUTH_CONFIG = {
  clientId: credentials.client_id,
  clientSecret: credentials.client_secret,
  redirectUri: 'http://localhost:5000/oauth/callback',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/wallet_object.issuer',
    'openid',
    'email'
  ]
};

let savedAccessToken = null;
let tokenExpiry = null;

// Générer l'URL d'authentification
function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    response_type: 'code',
    scope: OAUTH_CONFIG.scopes.join(' '),
    redirect_uri: OAUTH_CONFIG.redirectUri,
    access_type: 'offline',
    prompt: 'consent'
  });
  
  return `${OAUTH_CONFIG.authUrl}?${params.toString()}`;
}

// Échanger le code pour un token
async function exchangeCodeForToken(code) {
  try {
    const response = await fetch(OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: OAUTH_CONFIG.clientId,
        client_secret: OAUTH_CONFIG.clientSecret,
        code: code,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    const data = await response.json();
    
    if (data.access_token) {
      savedAccessToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000);
      
      // Sauvegarder le refresh token pour plus tard
      if (data.refresh_token) {
        fs.writeFileSync('./certs/google-wallet-refresh-token.txt', data.refresh_token);
      }
      
      console.log('✅ Token OAuth obtenu avec succès!');
      return data.access_token;
    } else {
      console.error('❌ Erreur:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur échange code:', error.message);
    return null;
  }
}

// Rafraîchir le token si expiré
async function refreshAccessToken() {
  try {
    const refreshTokenPath = './certs/google-wallet-refresh-token.txt';
    if (!fs.existsSync(refreshTokenPath)) {
      return null;
    }

    const refreshToken = fs.readFileSync(refreshTokenPath, 'utf8').trim();
    
    const response = await fetch(OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: OAUTH_CONFIG.clientId,
        client_secret: OAUTH_CONFIG.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });

    const data = await response.json();
    
    if (data.access_token) {
      savedAccessToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000);
      return data.access_token;
    }
    return null;
  } catch (error) {
    console.error('❌ Erreur rafraîchissement token:', error.message);
    return null;
  }
}

// Obtenir un token valide (avec rafraîchissement si nécessaire)
async function getValidAccessToken() {
  // Si on a un token et qu'il n'a pas expiré, le réutiliser
  if (savedAccessToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return savedAccessToken;
  }

  // Sinon, rafraîchir
  return await refreshAccessToken();
}

// Setup serveur pour OAuth callback
function setupOAuthServer() {
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/oauth/callback')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>❌ Erreur OAuth:</h1><p>${error}</p>`);
        return;
      }

      if (code) {
        const token = await exchangeCodeForToken(code);
        if (token) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <h1>✅ Authentification réussie!</h1>
            <p>Token reçu, tu peux fermer cette fenêtre.</p>
            <p>Retourne au terminal.</p>
          `);
          
          // Fermer le serveur après 2 secondes
          setTimeout(() => {
            server.close();
            process.exit(0);
          }, 2000);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>❌ Erreur échange du code</h1>');
        }
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return server;
}

// Démarrer le processus d'authentification
async function authenticate() {
  console.log('\n🔐 AUTHENTIFICATION GOOGLE WALLET (OAuth)\n');
  console.log('1️⃣  Démarrage du serveur OAuth...\n');

  const server = setupOAuthServer();
  server.listen(5001, () => {
    console.log('✅ Serveur OAuth écoutant sur http://localhost:5001\n');
    console.log('2️⃣  Ouvre cette URL dans ton navigateur:\n');
    
    const authUrl = getAuthUrl();
    console.log(`   ${authUrl}\n`);
    
    console.log('3️⃣  Accepte l\'autorisation Google');
    console.log('4️⃣  Tu seras redirigé et le token sera sauvegardé\n');
    console.log('⏳ En attente de réponse...\n');
  });

  server.on('error', (error) => {
    console.error('❌ Erreur serveur:', error.message);
    process.exit(1);
  });
}

// Export pour utilisation dans googleWalletManager
export { getValidAccessToken, authenticate };
