# 🔐 **Session 24h par Appareil - Guide d'Installation**

## **Qu'est-ce qui change?**

✅ **Plus besoin de se reconnecter constamment** - Vous restez connecté **24h** sur chaque appareil après votre dernière activité

✅ **Sécurité par appareil** - Un nouvel appareil = une nouvelle connexion requise (détection automatique)

✅ **Gestion centralisée** - Voyez tous vos appareils connectés et déconnectez-les à distance

## **⚙️ Installation Backend**

### Étape 1: Créer la table sessions

```bash
cd c:\wamp64\www\projet_carte_fid-lit-\backend
node migrate-sessions.js
```

**Sortie attendue:**
```
🔗 Étape 1: Connexion à MySQL...
📝 Étape 2: Création de la table sessions...
✅ Table sessions créée (ou déjà existante)

✅ Migration réussie!
```

### Étape 2: Les fichiers Backend

- `utils/sessionManager.js` - Gestion des sessions
- `middlewares/auth.js` (modifié) - Vérification du device à chaque requête
- `controllers/apiController.js` (modifié) - Endpoints Pro pour sessions
- `routes/apiRoutes.js` (modifié) - Nouvelles routes

## **🎨 Frontend**

### Fichiers Modifiés/Créés:

- `api.js` - Ajoute le deviceId au header `X-Device-Id`
- `pages/ProLogin.jsx` - Stocke le deviceId à la connexion
- `pages/ProDashboard.jsx` - Nouveau tab "Appareils (24h)"
- `pages/DeviceManager.jsx` - Onglet de gestion des appareils **NEW**

## **🧪 Comment ça fonctionne**

### Login Entreprise (Pro)

```
1. Entreprise se connecte avec email + mot de passe
2. Backend génère une "empreinte d'appareil" basée sur:
   - User-Agent du navigateur
   - IP de la requête
3. Token JWT retourné (24h expiration)
4. Session créée en base: (entreprise_id + device_id + token_hash + last_activity + expires_at)
5. deviceId stocké en localStorage du navigateur
```

### Chaque Requête Suivante

```
1. Frontend envoie:
   - Authorization: Bearer {token}
   - X-Device-Id: {deviceId}
2. Backend vérifie:
   - Token JWT valide?
   - Device session existe?
   - Pas expirée? (expires_at > NOW)
   - last_activity mise à jour si > 1 min d'inactivité
3. Requête rejetée = 401 "Session expirée ou appareil non reconnu. Reconnexion requise."
```

### Après 24h d'Inactivité

```
- La DB supprime automatiquement les sessions expirées via ON UPDATE CURRENT_TIMESTAMP
- À la prochaine requête: session pas trouvée → 401 → Redirection /pro/login
```

### Nouvel Appareil

```
- L'appareil n'a pas de deviceId en localStorage
- Header X-Device-Id manquant → 401
- Redirection automatique vers /pro/login
- Nouvelle connexion requise
```

## **📱 Onglet "Appareils (24h)"**

Disponible dans le Dashboard Pro:

```
🔐 Appareils (24h)
├─ Affiche tous les devices connectés
├─ Montre : Nom, Dernière Activité, Expiration
├─ Bouton "Déconnecter" pour chaque appareil
├─ Bouton "Déconnecter tous les autres" (garde celui-ci connecté)
└─ Info: Comment fonctionne la session 24h
```

## **API Endpoints Nouveaux/Modifiés**

### Login (Modifié)
```
POST /api/pro/login
Response:
{
  token: "jwt...",
  deviceId: "sha256hash...",
  mustChangePassword: false,
  companyId: "uuid...",
  nom: "Company Name",
  statut: "actif"
}
```

### Sessions (NOUVEAU)
```
GET /api/pro/sessions
Response: Array<{
  device_id, 
  device_name, 
  last_activity, 
  expiresIn,
  isCurrentDevice
}>

POST /api/pro/logout-device
Body: { deviceId }
Response: { success, message }

POST /api/pro/logout-all
Body: { keepCurrent: true }
Response: { success, message, devicesRemoved }
```

## **🔄 Architecture Sécurité**

### Table sesssions
```sql
CREATE TABLE sessions (
  id VARCHAR(36),                    -- Session UUID
  entreprise_id VARCHAR(36),         -- FK to entreprises
  device_id VARCHAR(36),             -- Device fingerprint SHA256
  device_name VARCHAR(100),          -- User-Agent
  token_hash VARCHAR(255),           -- SHA256(token + salt)
  last_activity TIMESTAMP,           -- Auto-update on each request
  expires_at TIMESTAMP,              -- JWT exp + 24h
  created_at TIMESTAMP,              -- When device first connected
  UNIQUE (entreprise_id, device_id)  -- Un device par entreprise
);
```

### Device Fingerprint (côté Backend)
```javascript
Hash = SHA256(User-Agent:IP)
Exemple: "a1b2c3d4e5f6g7h8" (première 16 chars du hash)
```

### Device Fingerprint (côté Frontend)
Sur navigateur A:
- Device ID = "a1b2c3d4e5f6g7h8"
- Stocké en localStorage
- Envoyé avec chaque requête

Sur navigateur B (même machine):
- Généré automatiquement (depuis User-Agent du navigateur B que ça génère un hash différent):
- Device ID = "x9y8z7w6v5u4t3s2" (différent!)
- Pas en localStorage (nouveau navigateur)
- Header X-Device-Id manquant → 401
- ✅ Reconnexion requise

## **⏰ Timeline: Vie d'une Session**

```
T=0h (Login)
├─ POST /api/pro/login ✅
├─ Session créée
├─ expires_at = NOW + 24h
└─ deviceId stocké en localStorage

T=5h (Utilisation)
├─ Requête GET /api/pro/clients
├─ Vérification: NOW <= expires_at ✅
├─ last_activity = NOW (5h)
└─ Requête OK ✅

T=24h (Dernière activité était à 5h, donc cutoff est 5h + 24h = 29h)
├─ Requête GET /api/pro/clients
├─ Vérification: NOW > expires_at ❌
├─ Session supprimée auto
└─ 401 → Redirection /pro/login

T=25h (Rien depuis 5h)
├─ Tentatif de faire une requête
├─ Vérification: NOW > expires_at ❌
└─ 401 → Redirection /pro/login
```

**Important:** C'est **24h d'INACTIVITÉ**, pas 24h de la première connexion!

Si vous utilisez le service à 23h50, la session expire à 23h50 + 24h = 23h50 le jour suivant.
Si vous êtes inactif 24h, reredirection automatique.

## **🧪 Test Rapide**

### Test 1: Même Appareil = Session Active
```
1. Ouvre Safari et connecte-toi: /pro/login
2. Ferme Safari
3. Réouvre Safari - Va sur localhost:3000
4. RÉSULTAT: Devrait être connecté (token encore valide)
5. Va dans Dashboard → Onglet "Appareils (24h)"
6. Vois: 1 session avec "Safari (Linux)" (ou ton navigateur)
```

### Test 2: Nouvel Appareil = Reconnexion Requise
```
1. Connecté sur Safari
2. Ouvre le même localhost:3000 dans Chrome
3. RÉSULTAT: Redirection vers /pro/login
4. Se reconnecter dans Chrome
5. Va dans "Appareils (24h)" sur Safari ET Chrome
6. RÉSULTAT: 2 sessions différentes!
```

### Test 3: Déconnecte un Appareil
```
1. 2 navigateurs connectés
2. Dans Safari: Dashboard → Appareils → "Déconnecter" Chrome
3. Essaie une requête API dans Chrome
4. RÉSULTAT: 401 → Redirection /pro/login
```

### Test 4: 24h Countdown
```
Simulation (sans attendre vraiment 24h):
1. SELECT * FROM sessions; 
2. Vérifier: expires_at = NOW() + 24h ✓
```

## **Troubleshooting**

### "Token manquant" ou "Device ID manquant"
↳ localStorage vidé, ou navigateur en mode privé. Réouvrir et reconnecter.

### "Session expirée après quelques requêtes"
↳ Vérifier que last_activity s'update (max 1x par minute pour perf)
↳ Vérifier dans DB: `SELECT * FROM sessions WHERE entreprise_id = 'xxx';`

### Appareil non reconnu même navigateur
↳ User-Agent peut changer après update navigateur
↳ Vider localStorage et reconnecter

## **Production**

En production, changez:
```javascript
// frontend/src/api.js
const API_URL = 'https://api.votredomaine.com/api'

// backend/.env
JWT_SECRET=change_this_to_long_random_string
```

Et pour Docker:
```dockerfile
# Ajouter après npm install backend
RUN npm run migrate-sessions
```

---

**Enjoy rester connecté 24h! 🎉**
