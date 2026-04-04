# Architecture Backend - Guide Détaillé

## 📁 Structure Fichiers

```
backend/
├── server.js                 # Démarrage Express + middlewares CORS
├── db.js                     # Pool MySQL
├── .env                      # Variables d'environnement
├── package.json              # Dépendances
├── .gitignore               # node_modules, .env
├── certs/                    # Certificats Apple (optionnel)
│   ├── wwdr.pem
│   ├── signingCert.p12
│   └── signingKey.key
├── passes/                   # Template Apple Wallet (optionnel)
│   └── loyalty.pass/
├── middlewares/
│   └── auth.js              # JWT, RBAC: verifyToken, isAdmin, isPro
├── routes/
│   └── apiRoutes.js         # Toutes les routes + middlewares
└── controllers/
    └── apiController.js     # Logique métier (26 fonctions détaillées)
```

## 🚀 Démarrage du Serveur (server.js)

```javascript
// 1. Express app
const app = express()

// 2. Middlewares CORS
app.use(cors())

// 3. Body parser JSON
app.use(express.json())

// 4. Routes
app.use('/api', apiRoutes)

// 5. Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }))

// 6. Écoute
app.listen(PORT)
```

## 🗄️ Base de Données (db.js)

```javascript
// Pool MySQL2 avec Promise support
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'loyalty_saas',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Utilisation:
// const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [id])
```

## 🔐 Authentification (middlewares/auth.js)

### generateToken(userId, role)
```javascript
// Crée un JWT
// Payload: { id: userId, role }
// Expiration: 24h
// Signing: HS256 avec JWT_SECRET

// Utilisation:
const token = generateToken(company.id, 'pro')
// Token contient l'ID de l'entreprise
```

### verifyToken (middleware)
```javascript
// Extrait le token du header Authorization
// Vérifie la signature
// Stocke req.user = { id, role }
// Erreur 401 si token manquant ou invalide
```

### isAdmin (middleware)
```javascript
// Vérifie req.user.role === 'admin'
// Erreur 403 si non-admin
// DOIT être utilisé APRÈS verifyToken
```

### isPro (middleware)
```javascript
// Vérifie req.user.role === 'pro'
// Erreur 403 si non-pro
// DOIT être utilisé APRÈS verifyToken
```

## 🛣️ Routes (routes/apiRoutes.js)

```javascript
// ADMIN routes
router.post('/admin/login', apiController.adminLogin)
router.post('/admin/create-company', verifyToken, isAdmin, apiController.createCompany)
router.put('/admin/suspend-company/:companyId', verifyToken, isAdmin, ...)
router.put('/admin/reactivate-company/:companyId', verifyToken, isAdmin, ...)
router.delete('/admin/delete-company/:companyId', verifyToken, isAdmin, ...)

// PRO routes
router.post('/pro/login', apiController.proLogin)
router.put('/pro/change-password', verifyToken, isPro, apiController.changePassword)
router.get('/pro/clients', verifyToken, isPro, apiController.getClients)
router.post('/pro/scan', verifyToken, isPro, apiController.handleScan)
router.put('/pro/adjust-points/:clientId', verifyToken, isPro, ...)
router.put('/pro/update-reward', verifyToken, isPro, ...)
router.get('/pro/info', verifyToken, isPro, apiController.getProInfo)

// PUBLIC routes
router.post('/join/:entrepriseId', apiController.registerClientAndGeneratePass)
router.get('/companies/:companyId/info', apiController.getCompanyInfo)
```

## 🎯 Contrôleur API (controllers/apiController.js)

### SECTION 1: Master Admin

#### adminLogin
```javascript
// 1. Récupérer super_admin par identifiant
// 2. Comparer mot de passe (bcrypt.compare)
// 3. Si invalide → 401
// 4. Sinon → générer token avec role='admin'
// 5. Retourner token

// Requête:
POST /admin/login
{ "identifiant": "master_admin", "mot_de_passe": "..." }

// Réponse:
{ "token": "eyJ...", "message": "Connecté" }
```

#### createCompany
```javascript
// 1. Valider inputs: nom, email
// 2. Générer UUID pour company_id
// 3. Générer mot de passe temporaire (8 chars random)
// 4. Hasher le mot de passe (bcryptjs, 10 rounds)
// 5. INSERT INTO entreprises(...) VALUES(...)
// 6. Retourner les identifiants (avec password EN CLAIR pour affichage)

// Erreurs gérées:
// - 400: Champs manquants
// - 400: Email déjà existe (ER_DUP_ENTRY)
// - 500: Erreur serveur

// Requête (+ Bearer token admin):
POST /admin/create-company
{ "nom": "Café", "email": "cafe@example.com" }

// Réponse:
{
  "success": true,
  "companyId": "uuid",
  "email": "cafe@example.com",
  "temporaryPassword": "a9k3m2p1",
  "message": "..."
}
```

#### suspendCompany / reactivateCompany / deleteCompany
```javascript
// UPDATE/DELETE FROM entreprises WHERE id = ?
// Erreurs 404 si not found
// deleteCompany: cascade deletes clients (via FK ON DELETE CASCADE)
```

### SECTION 2: Pro / Entreprise

#### proLogin
```javascript
// 1. Récupérer entreprise par email
// 2. Vérifier statut !== 'suspendu' → 403
// 3. Comparer mot de passe (bcrypt.compare)
// 4. Générer token avec role='pro' et id=company_id
// 5. Retourner token + mustChangePassword flag

// Requête:
POST /pro/login
{ "email": "cafe@example.com", "mot_de_passe": "..." }

// Réponse:
{
  "token": "eyJ...",
  "mustChangePassword": true/false,
  "companyId": "uuid",
  "nom": "Café"
}
```

#### changePassword
```javascript
// 1. Récupérer company_id du token (req.user.id)
// 2. Valider newPassword (min 6 chars)
// 3. Hasher le nouveau
// 4. UPDATE entreprises SET mot_de_passe=?, must_change_password=FALSE
// 5. Retourner succès

// Protections:
// - Token requis (isPro)
// - Minimum 6 caractères
```

#### getProInfo
```javascript
// 1. Récupérer company_id du token
// 2. SELECT id, nom, email, recompense_definition FROM entreprises WHERE id = ?
// 3. Retourner l'info

// Isolation:
// - Ne retourne que les données de CETTE entreprise
```

#### getClients
```javascript
// 1. Récupérer company_id du token
// 2. SELECT nom, prenom, telephone, points, type_wallet FROM clients
//    WHERE entreprise_id = ? ORDER BY created_at DESC
// 3. Retourner tableau

// 🔒 ISOLATION STRICTE:
// WHERE entreprise_id = req.user.id
// = Chaque entreprise voit UNIQUEMENT ses clients

// Si requis: SELECT ... WHERE id = ? (sans entreprise_id)
// = FAILLE CRITIQUE DE SÉCURITÉ !
```

#### handleScan
```javascript
// 🎯 LA FONCTION CLÉ DU SYSTÈME

// 1. Récupérer company_id du token
// 2. Récupérer clientId depuis le QR code (body)
// 3. VÉRIFIER: SELECT points FROM clients
//    WHERE id = ? AND entreprise_id = ?
//    → Si aucun résultat: 404 (client non trouvé OR not de cette compagnie)
// 4. INCRÉMENTER: UPDATE clients SET points = points + 1
//    WHERE id = ? AND entreprise_id = ?
// 5. RÉCUPÉRER NOUVEAU SOLDE: SELECT points FROM clients
// 6. Si (newPoints % 10 === 0):
//    a. SELECT recompense_definition FROM entreprises WHERE id = ?
//    b. response.rewardUnlocked = true
//    c. response.rewardText = recompense_definition
//    d. 🚀 TODO: APPELER APPLE APNs OU GOOGLE WALLET API ICI
// 7. Retourner: { success, newPoints, clientName, rewardUnlocked, rewardText }

// 🔒 SÉCURITÉ:
// - DOUBLE filtrage: AND entreprise_id = req.user.id (deux fois)
// - Une entreprise ne peut jamais scanner les clients d'une autre
// - Le clientId DOIT appartenir à cette entreprise

// TODO Comment:
// TODO: Insérer ici la requête HTTP vers les serveurs Apple APNs
// Apple APNs:
//   POST https://api.push.apple.com/3/device/{deviceToken}
//   Header: Authorization: Bearer {JWT signé avec certificat Apple}
//   Body: { "aps": { "alert": "Récompense débloquée !", ... } }
// Google Wallet:
//   POST https://www.googleapis.com/walletobjects/v1/genericObject/{id}
//   Authorization: Bearer {Google API Key}
//   Body: { "generic": { "points": {...} } }
```

#### adjustPoints
```javascript
// 1. Récupérer company_id du token
// 2. Valider adjustment est un nombre
// 3. Récupérer points actuels (avec isolation)
// 4. newPoints = MAX(0, current + adjustment)
//    (évite points < 0)
// 5. UPDATE clients SET points = ? WHERE id = ? AND entreprise_id = ?
// 6. Retourner newPoints

// Cas d'usage:
// - Bouton +1 dans dashboard
// - Bouton -1 dans dashboard
// - Correction manuelle
```

#### updateReward
```javascript
// 1. Récupérer company_id du token
// 2. Valider recompense_definition non-vide
// 3. UPDATE entreprises SET recompense_definition = ? WHERE id = ?
// 4. Retourner succès

// Utilisation:
// - Commerçant change le texte de sa récompense
// - "Un café offert" → "Une pâtisserie au choix"
```

### SECTION 3: Public - Client Registration

#### getCompanyInfo
```javascript
// 1. Récupérer company_id depuis URL (PUBLIC, pas d'auth)
// 2. SELECT id, nom, recompense_definition FROM entreprises
//    WHERE id = ? AND statut = 'actif'
// 3. Si not found → 404
// 4. Retourner info publique

// Note: Retourne UNIQUEMENT si statut = 'actif'
// Entreprise suspendue → 404
```

#### registerClientAndGeneratePass
```javascript
// 🎯 LA DEUXIÈME FONCTION CLÉ

// == ÉTAPE 1: VALIDATION ==
// 1. Valider tous les champs: nom, prenom, telephone, type_wallet
// 2. Valider type_wallet ∈ ['apple', 'google']

// == ÉTAPE 2: VÉRIFICATION ENTREPRISE ==
// 3. SELECT id, nom FROM entreprises WHERE id = ? AND statut = 'actif'
// 4. Si not found → 404

// == ÉTAPE 3: CRÉATION CLIENT ==
// 5. Générer clientId = UUIDv4()
// 6. INSERT INTO clients(id, entreprise_id, nom, prenom, telephone, points, type_wallet)
//    VALUES(clientId, entrepriseId, ...)
// 7. points INITIAL = 0

// == ÉTAPE 4A: APPLE WALLET ==
// 8. Si type_wallet === 'apple':
//    a. Créer PKPass object (passkit-generator)
//    b. Config:
//       - serialNumber: clientId (DOIT être unique)
//       - description: "Café du Coin - Carte de Fidélité"
//       - passTypeIdentifier: "pass.com.example.loyalty.{clientId}"
//       - teamIdentifier: APPLE_TEAM_ID
//       - barcodes[0].format: PKBarcodeFormatQR
//       - barcodes[0].message: clientId ⭐ CE CLIENTID SERA SCANNÉ
//       - generic.primaryFields: points
//       - generic.secondaryFields: nom du titulaire
//    c. Utiliser certificats:
//       - wwdr: backend/certs/wwdr.pem
//       - signingCert: backend/certs/signingCert.p12
//       - signingKey: backend/certs/signingKey.key
//    d. Générer buffer (pass.getAsBuffer())
//    e. Retourner avec header:
//       Content-Type: application/vnd.apple.pkpass
//       Content-Disposition: attachment; filename="{prenom}-{nom}-loyalty.pkpass"
//       Et le buffer
//    f. Le navigateur du client télécharge/ouvre le fichier

// == ÉTAPE 4B: GOOGLE WALLET ==
// 9. Si type_wallet === 'google':
//    a. Retourner JSON avec clientId
//    b. Frontend utilisera cet ID pour créer le pass via Google Wallet API
//    c. (Implémentation complète de Google Wallet API complexe, simplifiée ici)

// == ERREURS GÉRÉES ==
// - 400: Champs manquants
// - 400: Type wallet invalide
// - 404: Entreprise not found/inactive
// - 500: Erreur génération pass (certifs manquants)
//   → Retourner quand même 500 + clientId
//      (client créé en base, juste pass non généré)

// 🔒 CRITIQUES:
// - Client créé AVANT génération pass (pas de perte de données)
// - clientId = UUIDv4() unique et irrévocable
// - clientId encodé DANS le QR code du pass
// - QR code = clé de lecture du pass par le commerçant

// 🚀 FLUX:
// Client scanne QR au comptoir
//   → Ouvre /join/:entrepriseId
//   → Remplit formulaire
//   → POST /join/:entrepriseId
//   → Backend crée client + génère pass
//   → Fichier .pkpass téléchargé/ouvert
//   → Client clique "Ajouter"
//   → Pass dans wallet du client
//   → Commerçant scanne QR du pass
//   → Backend reçoit clientId
//   → POST /pro/scan avec clientId
//   → Points +1 ✓
```

## 🔒 Sécurité - Principes Clés

### 1. Isolation des Données
```javascript
// ✅ BON
SELECT * FROM clients WHERE id = ? AND entreprise_id = req.user.id
// Une entreprise ne peut JAMAIS voir les clients d'une autre

// ❌ MAUVAIS (FAILLE)
SELECT * FROM clients WHERE id = ?
// N'importe qui peut accéder à n'importe quel client !
```

### 2. Hachage des Mots de Passe
```javascript
// Stockage
const hash = await bcryptjs.hash(plainPassword, 10)
// Vérification
const isValid = await bcryptjs.compare(plainPassword, hash)
```

### 3. JWT + RBAC
```javascript
// Token contient: { id (companyId), role (admin|pro) }
// Middlewares vérifient le role avant d'exécuter
// Une entreprise NE PEUT JAMAIS changer de role vers 'admin'
```

### 4. Validation des Inputs
```javascript
// Tous les inputs sont validés:
if (!nom || !email) return res.status(400).json({ error: '...' })
if (!['apple', 'google'].includes(type_wallet)) return res.status(400)...
```

### 5. Gestion des Erreurs
```javascript
// Try/catch globaux
// Pas d'exposition de stack traces en production
// Messages d'erreur génériques si besoin
```

## 📊 État de la Base après Opérations

### Après Admin crée entreprise
```sql
INSERT INTO entreprises (id, nom, email, mot_de_passe, statut, recompense_definition, must_change_password)
VALUES ('uuid', 'Café', 'cafe@ex.fr', 'bcrypt_hash', 'actif', 'Surprise !', TRUE)
```

### Après Pro se connecte + change password
```sql
UPDATE entreprises SET 
  mot_de_passe = 'new_bcrypt_hash',
  must_change_password = FALSE
WHERE id = 'uuid'
```

### Après Client crée son compte
```sql
INSERT INTO clients (id, entreprise_id, nom, prenom, telephone, points, type_wallet)
VALUES ('client_uuid', 'enterprise_uuid', 'Dupont', 'Jean', '0612345678', 0, 'apple')
```

### Après Pro scanne (handleScan)
```sql
UPDATE clients SET points = points + 1 WHERE id = 'client_uuid'
-- Re-fetch pour récupérer newPoints
-- Si newPoints % 10 === 0 → rewardUnlocked
```

## 🧪 Tests Manuels

### 1. Login Admin
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"identifiant":"master_admin","mot_de_passe":"AdminPassword123!"}'
# Reçoit token
```

### 2. Créer entreprise
```bash
curl -X POST http://localhost:5000/api/admin/create-company \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"nom":"Café du Coin","email":"cafe@ex.fr"}'
# Reçoit: companyId, temporaryPassword
```

### 3. Pro login
```bash
curl -X POST http://localhost:5000/api/pro/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cafe@ex.fr","mot_de_passe":"a9k3m2p1"}'
# Reçoit: token, mustChangePassword: true
```

### 4. Pro change password
```bash
curl -X PUT http://localhost:5000/api/pro/change-password \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"newPassword":"NewPassword123!"}'
# Success
```

### 5. Créer client (public)
```bash
curl -X POST http://localhost:5000/api/join/{companyId} \
  -H "Content-Type: application/json" \
  -d '{"nom":"Dupont","prenom":"Jean","telephone":"0612345678","type_wallet":"apple"}'
# Reçoit: fichier .pkpass (Apple) OU clientId (Google)
```

### 6. Scanner (Pro)
```bash
curl -X POST http://localhost:5000/api/pro/scan \
  -H "Authorization: Bearer {PRO_TOKEN}" \
  -d '{"clientId":"{CLIENT_UUID}"}'
# Reçoit: { success, newPoints, clientName, rewardUnlocked?, rewardText? }
```

## 🚀 Déploiement Production

### Checklist
- [ ] JWT_SECRET = clé forte (128 bits min)
- [ ] HTTPS obligatoire
- [ ] Certificats Apple uploadés
- [ ] MySQL avec backups réguliers
- [ ] Rate limiting sur login
- [ ] CORS restrictif
- [ ] Logs centralisés
- [ ] Monitoring des erreurs

---

**Last Update: 2026**
**Version: 1.0.0**
