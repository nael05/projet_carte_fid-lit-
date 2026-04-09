# 📱 Plan d'Intégration Apple Wallet - Cartes de Fidélité

## 🎯 Objectif
Intégrer la création et l'ajout de cartes Apple Wallet (.pkpass) basées sur les informations du formulaire client et du type de loyauté (points/tampons) de l'entreprise.

---

## 📊 Architecture Générale

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Frontend)                        │
│  Formulaire Création Client + Bouton "Ajouter au Wallet"   │
└────────────────────────────┬────────────────────────────────┘
                             │ POST /pro/add-to-wallet
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js)                          │
│  • Validation données client                                 │
│  • Génération .pkpass avec credentials Apple                │
│  • Génération QR code personnalisé                          │
│  • Upload vers serveur                                       │
└────────────────────────────┬────────────────────────────────┘
                             │ Réponse: URL .pkpass || Erreur
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              CLIENT PEUT CLIQUER SUR LIEN                   │
│            → Ouvre Apple Wallet automatiquement              │
│            → Ajoute la carte au Wallet                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Structure Base De Données

### 1. Table `card_customization` (MODIFIÉE)
```sql
ALTER TABLE card_customization ADD COLUMN (
  -- Apple Wallet Credentials
  apple_team_id VARCHAR(50) COMMENT 'Team ID Apple Developer',
  apple_pass_type_id VARCHAR(100) COMMENT 'Pass Type ID (com.apple...)',
  apple_certificate_path VARCHAR(255) COMMENT 'Chemin cert PKCS12',
  apple_certificate_password VARCHAR(255) COMMENT 'Mot de passe cert',
  
  -- Apple Card Design
  apple_logo_url VARCHAR(255) COMMENT 'URL du logo',
  apple_icon_url VARCHAR(255) COMMENT 'URL de l\'icône',
  apple_strip_image_url VARCHAR(255) COMMENT 'Image en haut de la carte',
  apple_background_color VARCHAR(10) COMMENT 'Couleur fond (hex)',
  apple_text_color VARCHAR(10) COMMENT 'Couleur texte (hex)',
  apple_label_color VARCHAR(10) COMMENT 'Couleur labels (hex)',
  
  -- Apple Card Content
  apple_pass_description VARCHAR(255) COMMENT 'Description générale',
  apple_organization_name VARCHAR(255) COMMENT 'Nom organisation',
  apple_barcode_format VARCHAR(50) COMMENT 'Format QR: QR, PDF417, etc.',
  
  INDEX idx_apple_pass_type (apple_pass_type_id)
);
```

### 2. Table `wallet_cards` (NOUVELLE)
```sql
CREATE TABLE wallet_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  company_id INT NOT NULL,
  pass_serial_number VARCHAR(100) UNIQUE NOT NULL COMMENT 'Identifiant unique Apple',
  qr_code_value VARCHAR(255) NOT NULL COMMENT 'Valeur du QR (client ID)',
  initial_points INT DEFAULT 0 COMMENT 'Points initiaux',
  initial_stamps INT DEFAULT 0 COMMENT 'Tampons initiaux',
  
  pass_file_path VARCHAR(255) COMMENT 'Chemin du .pkpass généré',
  pass_file_expiry DATETIME COMMENT 'Date d\'expiration du fichier',
  
  wallet_added_date DATETIME,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (company_id) REFERENCES enterprises(id),
  INDEX idx_client (client_id),
  INDEX idx_company (company_id),
  INDEX idx_serial (pass_serial_number)
);
```

### 3. Table `pass_updates` (OPTIONNELLE - Pour suivi)
```sql
CREATE TABLE pass_updates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  wallet_card_id INT NOT NULL,
  action VARCHAR(50) COMMENT 'add_points, add_stamp, reward_unlocked',
  value INT,
  description VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (wallet_card_id) REFERENCES wallet_cards(id),
  INDEX idx_wallet_card (wallet_card_id),
  INDEX idx_created_at (created_at)
);
```

---

## 🔧 Backend - Implémentation

### 1. Fichiers à Créer/Modifier

#### `utils/appleWalletGenerator.js` (NOUVEAU)
```javascript
// Générer pass.json avec les infos du client
// Créer structure .pkpass
// Signer avec certificat Apple
// Retourner chemin du fichier

Structure:
- generatePassJSON(client, company, customization, loyaltyType)
- generateQRCode(clientId)
- createPassPackage(passJSON, images)
- signPass(passPath, certificate, password)
- uploadPass(filePath)
```

#### `utils/applePassConfig.js` (NOUVEAU)
```javascript
// Constantes et configurations Apple Wallet
// Format structure .pkpass
// Validations

Contient:
- PASS_STRUCTURE (manifest.json, signature, pass.json, images/)
- BACKUP_POINTS
- BARCODE_TYPES
```

#### `controllers/walletController.js` (NOUVEAU)
```javascript
// POST /pro/add-to-wallet
// POST /pro/wallet-status/:passSerialNumber
// POST /admin/wallet-sync (opt)
// GET /admin/wallet-cards (opt)
```

#### `routes/walletRoutes.js` (NOUVEAU)
```javascript
// Routes protégées pour wallet
// Authentification + autorisation
```

### 2. Endpoint: POST `/pro/add-to-wallet`

**Requête:**
```json
{
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "companyId": "12345",
  "loyaltyType": "points|stamps",
  "initialValue": 0,
  "deviceToken": "token_notification_optionnel"
}
```

**Réponse (succès):**
```json
{
  "success": true,
  "passURL": "https://votre-domaine.com/passes/ABC123DEF456.pkpass",
  "passSerialNumber": "ABC123DEF456",
  "message": "Carte créée! Cliquez le lien pour ajouter au Wallet",
  "expiryDate": "2027-04-09"
}
```

**Étapes du traitement:**
1. ✅ Valider client + company
2. ✅ Charger customization Apple
3. ✅ Générer pass.json avec:
   - Infos client (nom, prénom, téléphone)
   - QR code = clientId
   - Points/Tampons = valeur initiale
   - Logo/icônes du merchant
4. ✅ Créer structure .pkpass
5. ✅ Signer avec certificat Apple
6. ✅ Sauvegarder en BD: wallet_cards
7. ✅ Uploader fichier
8. ✅ Retourner URL de téléchargement

### 3. Endpoint: POST `/pro/update-pass-value` (UPDATE)

**Requête:**
```json
{
  "passSerialNumber": "ABC123DEF456",
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "action": "add_points|add_stamp|reward_unlocked",
  "value": 5,
  "description": "Achat vérifié"
}
```

**Logique:**
1. ✅ Récupérer wallet_card par serial number
2. ✅ Mettre à jour points/tampons
3. ✅ Vérifier palier de récompense atteint
4. ✅ Générer nouveau pass.json (valeurs mises à jour)
5. ✅ Re-signer et sauvegarder
6. ✅ **Envoyer Push Notification** (Apple Push) pour mettre à jour Wallet automatiquement

### 4. Packages NPM Nécessaires

```bash
npm install --save:
  - pkpass          # Générer .pkpass
  - applepush       # Apple Push Notifications
  - qrcode          # QR codes
  - jszip           # Compression .pkpass
  - openssl-wrapper # Signature certificats
  - node-uuid       # Identifiants uniques
```

---

## 💻 Frontend - Implémentation

### 1. Composant: `CustomerFormWithWallet.jsx` (NOUVEAU/MODIFIÉ)

```jsx
// Formulaire existant + Bouton "Ajouter au Wallet"
// États:
// - initial: affiche le bouton
// - loading: affiche spinner
// - success: affiche lien + QR ou lien direct
// - error: affiche message erreur

Fonctions principales:
- handleAddToWallet()
- downloadOrOpenPass(passURL)
- showSuccessModal()
```

### 2. Modifications: `ProDashboard.jsx`

**Avant:**
```jsx
// Onglet "Design Carte" supprimé
```

**Après:**
```jsx
// Ajouter bouton dans liste clients:
// "Ajouter au Wallet" → Ouvre modal formulaire
// OU directement depuis ProDashboard si client existe

// Afficher statut wallet:
// ✅ Carte ajoutée au wallet (date)
// ⏳ En attente d'ajout
// ❌ Erreur lors de l'ajout
```

### 3. Composant: `WalletAddModal.jsx` (NOUVEAU)

```jsx
// Modal pour ajouter un client au wallet
// Formulaire:
// - Nom
// - Prénom
// - Téléphone (optionnel)
// - [Bouton "Créer et Ajouter"]

// Affiche après création:
// - ✅ Succès message
// - Lien "Télécharger la carte"
// - QR code du lien
// - Instructions pour Apple Wallet
```

---

## 🔐 Configuration Apple Developer

### Prérequis:
1. **Apple Developer Account** (99$/an)
2. **Certificat Pass Type ID**
   - Format: `com.apple.mgmt.External.xxxxxxxx`
3. **Team ID Apple**
4. **Certificat PKCS#12 signé** (.p12)
5. **Certificat Apple Worldwide Developer Relations** (WWDR)

### Dans le Code:
```javascript
// .env
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_PASS_TYPE_ID=com.apple.mgmt.External.xxxxxxxx
APPLE_CERTIFICATE_PASSWORD=mot_de_passe
APPLE_CERTIFICATE_PATH=./certs/pass_certificate.p12
APPLE_WWDR_PATH=./certs/AppleWWDRCA.cer
```

---

## 📱 Flux Utilisateur Complet

### Scénario: Nouveau client crée sa carte et l'ajoute au Wallet

```
1. CLIENT REMPLIT FORMULAIRE
   ├─ Nom: "Jean Dupont"
   ├─ Prénom: "Jean"
   ├─ Téléphone: "06 12 34 56 78"
   └─ Clique: "Ajouter au Wallet"

2. FRONTEND
   ├─ POST /pro/add-to-wallet (données client)
   └─ Reçoit: {passURL, passSerialNumber, message}

3. BACKEND
   ├─ Valide les données
   ├─ Génère pass.json avec:
   │  ├─ QR code = clientId
   │  ├─ Nom client
   │  ├─ Points/Tampons = 0 (initial)
   │  └─ Logo entreprise
   ├─ Crée .pkpass
   ├─ Signe avec certificat Apple
   └─ Sauvegarde en BD

4. FRONTEND AFFICHE
   ├─ ✅ "Carte créée avec succès!"
   ├─ Lien: "Ajouter au Wallet"
   └─ [QR CODE du lien]

5. CLIENT CLIQUE LIEN
   ├─ Télécharge .pkpass
   └─ Apple Wallet s'ouvre automatiquement
      ├─ Affiche prévisualisation
      ├─ Client clique "Ajouter"
      └─ Carte sauvegardée dans Wallet ✅

6. SCAN QR EN MAGASIN
   ├─ Vendeur scanne QR (QR code = clientId)
   ├─ Backend met à jour: +1 point
   ├─ Génère nouveau pass
   └─ Apple Wallet met à jour automatiquement
      (Push Notification)
```

---

## 📋 Étapes d'Implémentation (ordre)

### **Phase 1: Infrastructure & Configuration** (3-4 jours)
- [ ] Configurer Apple Developer Account
- [ ] Obtenir certificats (Pass Type ID, PKCS#12)
- [ ] Créer migrations BD (card_customization, wallet_cards, pass_updates)
- [ ] Setup .env avec credentials Apple
- [ ] Installer packages NPM (pkpass, qrcode, openssl, etc.)

### **Phase 2: Backend - Génération Pass** (4-5 jours)
- [ ] Créer `appleWalletGenerator.js` (générer pass.json)
- [ ] Implémenter generateQRCode()
- [ ] Implémenter createPassPackage() (structure .pkpass)
- [ ] Implémenter signPass() (signature certificat)
- [ ] Tester avec fichier statique d'abord

### **Phase 3: Backend - API Endpoints** (2-3 jours)
- [ ] Créer `walletController.js`
- [ ] Endpoint POST `/pro/add-to-wallet`
- [ ] Endpoint POST `/pro/update-pass-value`
- [ ] Endpoint GET `/pro/wallet-status`
- [ ] Validation + error handling

### **Phase 4: Frontend - Components** (2-3 jours)
- [ ] Créer `WalletAddModal.jsx`
- [ ] Modifier `ProDashboard.jsx` + ajouter bouton
- [ ] Intégrer appel API
- [ ] Afficher lien + instructions de téléchargement

### **Phase 5: Apple Push Notifications** (2-3 jours)
- [ ] Configurer Apple Push Notifications
- [ ] Implémenter push lors update points
- [ ] Tester sur appareil iOS réel

### **Phase 6: Tests & Déploiement** (2-3 jours)
- [ ] Tests complets sur iOS en dev
- [ ] Tests des mises à jour (points→Wallet)
- [ ] Déploiement production
- [ ] Documentation pour clients

**Durée totale estimée: 15-21 jours**

---

## 🎯 Cas d'Usage Spécifiques

### Cas 1: Client avec Points
```json
{
  "pass.json": {
    "barcode": {"message": "550e8400-e29b-41d4"},
    "primaryFields": [
      {"key": "points", "label": "Points", "value": "0"}
    ],
    "auxiliaryFields": [
      {"key": "name", "label": "Nom", "value": "Jean Dupont"},
      {"key": "phone", "label": "Téléphone", "value": "06 12 34 56 78"}
    ]
  }
}
```

### Cas 2: Client avec Tampons
```json
{
  "pass.json": {
    "barcode": {"message": "550e8400-e29b-41d4"},
    "primaryFields": [
      {"key": "stamps", "label": "Tampons", "value": "0/10"}
    ],
    "auxiliaryFields": [
      {"key": "name", "label": "Nom", "value": "Marie Martin"},
      {"key": "tier", "label": "Palier actuel", "value": "Standard"}
    ]
  }
}
```

---

## 🔄 Flux Mise à Jour Automatique

Quand un client scanne:

```
1. Backend scanne QR → clientId
2. Met à jour: clients.points (+1) ou clients.stamps (+1)
3. Met à jour: wallet_cards (new value)
4. Génère nouveau pass.json
5. Envoie Push Notification Apple:
   POST https://api.push.apple.com/3/device/{deviceToken}
   {
     "aps": {
       "alert": "Nouveau point gagnée!",
       "badge": 1,
       "sound": "default"
     }
   }
6. Apple Wallet met à jour automatiquement la carte
```

---

## 📝 Fichiers à Créer/Modifier

### CRÉER:
```
backend/
├── utils/
│   ├── appleWalletGenerator.js      ⭐ Principal
│   ├── applePassConfig.js           (Helpers)
│   └── appleNotifications.js        (Push Apple)
├── controllers/
│   └── walletController.js          ⭐ API
├── routes/
│   └── walletRoutes.js              (Routes)
├── migrations/
│   └── add_wallet_cards_tables.sql  (BD)
└── certs/
    ├── pass_certificate.p12        (À obtenir)
    └── AppleWWDRCA.cer             (À obtenir)

frontend/
├── src/components/
│   └── WalletAddModal.jsx           ⭐ Modal formulaire
└── src/pages/
    └── ProDashboard.jsx             (Modifier)
```

### MODIFIER:
```
backend/
├── server.js                        (Ajouter routes /pro/wallet*)
├── .env                            (Ajouter config Apple)
└── package.json                    (Ajouter packages)

frontend/
└── src/pages/
    └── ProDashboard.jsx            (Ajouter bouton + modal)
```

---

## ⚠️ Points Critiques à Considérer

1. **Certificats Apple:**
   - Obtenir est fastidieux
   - Renouvellement annuel
   - Gérer les renouvellements

2. **Signature Pass:**
   - Très stricte format
   - Erreur de signature = pass invalide
   - Tester en dev d'abord

3. **Push Notifications:**
   - Nécessite iOS réel (pas simulator)
   - Token Change après update iOS
   - Gérer les tokens expiré

4. **Fichiers .pkpass:**
   - Générer à la demande?
   - Ou pré-générer + cache?
   - Considérer stockage serveur

5. **Performance:**
   - Génération pass peut être lente (cert + compression)
   - Considérer queue job (Bull.js / RabbitMQ)
   - Async processing si beaucoup d'appels

---

## 💡 Optimisations Futures

- [ ] Générer passes en arrière-plan (job queue)
- [ ] Cache des .pkpass générés
- [ ] Webhooks pour notifications
- [ ] Admin panel pour voir tous les wallets
- [ ] Stats: combien de clients dans Wallet?
- [ ] Export données pour analytics
- [ ] A/B Testing designs cartes

---

## 📚 Références Utiles

- Apple Wallet Pass Design: https://developer.apple.com/wallet/
- Pkpass Library: https://www.npmjs.com/package/pkpass
- Pass Kit Spec: https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/index.html
- Apple Push Notifications: https://developer.apple.com/documentation/usernotifications

---

**Status:** 📋 Plan détaillé ready
**Prochaine étape:** Commencer Phase 1 - Configuration Apple Developer
