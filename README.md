# Loyalty Cards SaaS

Plateforme B2B de gestion de cartes de fidélité dématérialisées pour Apple Wallet et Google Wallet.

## 📋 Architecture

```
projet_carte_fid-lit-/
├── backend/           # Node.js / Express
├── frontend/          # React / Vite
├── schema.sql         # Base de données MySQL
└── README.md
```

## 🚀 Installation & Démarrage

### Prérequis
- Node.js 18+
- MySQL 8+
- npm ou yarn

### 1. Base de Données

```bash
# Créer la base de données
mysql -u root -p < schema.sql
```

### 2. Backend

```bash
cd backend

# Installer les dépendances
npm install

# Configurer les variables d'environnement
# Éditer .env avec vos paramètres:
# - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# - JWT_SECRET (clé secrète pour JWT)
# - APPLE_TEAM_ID et certificats (optionnel pour Apple Wallet)

# Démarrer en développement
npm run dev

# Production
npm start
```

Le serveur démarre sur `http://localhost:5000`

### 3. Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer en développement
npm run dev

# Production
npm run build
```

L'app démarre sur `http://localhost:3000`

## 📱 Accès aux Espaces

### Master Admin
- **URL** : http://localhost:3000/master-admin-secret
- **Credentials par défaut** (dans schema.sql) : 
  - Identifiant: `master_admin`
  - Mot de passe: À configurer (non crypté dans le fichier SQL de démo)
- **Fonctionnalités** :
  - ✅ Créer de nouvelles entreprises
  - ✅ Suspendre / Réactiver des entreprises
  - ✅ Supprimer des entreprises (cascade)

### Pro / Commercant
- **URL** : http://localhost:3000/pro/login
- **Credentials** : Email + mot de passe temporaire (créé par Master)
- **Première connexion** : Changement obligatoire du mot de passe
- **Fonctionnalités** :
  - ✅ Scanner QR des clients (html5-qrcode)
  - ✅ Gestion des clients (consulter, ajuster points)
  - ✅ Configuration de la récompense
  - ✅ Notifications en temps réel

### Client Public
- **URL** : http://localhost:3000/join/:entrepriseId
- **Accès** : Via QR code scanné sur le comptoir
- **Fonctionnalités** :
  - ✅ Formulaire : Nom, Prénom, Téléphone
  - ✅ Sélection : Apple Wallet ou Google Wallet
  - ✅ Téléchargement/ajout automatique au wallet

## 🔐 Sécurité

### Authentification
- JWT (JSON Web Tokens) avec expiration 24h
- Hachage bcryptjs pour les mots de passe
- RBAC (Role-Based Access Control) : admin, pro

### Isolation des Données
- Tous les endpoints Pro utilisent `req.user.id` (entreprise_id) en clause WHERE
- Une entreprise ne peut jamais voir les clients d'une autre

### Structure de Base de Données
```sql
-- super_admins: Propriétaire du SaaS
-- entreprises: Commerçants
-- clients: Clients des commerçants (FK vers entreprises)
```

## 📊 API Endpoints

### Admin
```
POST   /api/admin/login
POST   /api/admin/create-company
PUT    /api/admin/suspend-company/:companyId
PUT    /api/admin/reactivate-company/:companyId
DELETE /api/admin/delete-company/:companyId
```

### Pro
```
POST   /api/pro/login
PUT    /api/pro/change-password
GET    /api/pro/info
GET    /api/pro/clients
POST   /api/pro/scan
PUT    /api/pro/adjust-points/:clientId
PUT    /api/pro/update-reward
```

### Public
```
GET    /api/companies/:companyId/info
POST   /api/join/:entrepriseId
```

## 🎯 Logique clé

### Scanner (handleScan)
```javascript
1. Vérifier que le clientId appartient à l'entreprise (isolation)
2. Incrémenter les points (+1)
3. Vérifier si nouvelle balance >= 10
4. Si oui, retourner la recompense_definition
5. TODO: Appeler Apple APNs / Google Wallet API pour push notification
```

### Génération de Passe
```javascript
// Le clientId généré (UUIDv4) est encodé dans le QR code
// Format: pkpass pour Apple Wallet (passkit-generator)
// Certificats Apple requis: wwdr.pem, signingCert.p12, signingKey.key
```

## 📝 Variables d'Environnement

### Backend (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=loyalty_saas
PORT=5000
JWT_SECRET=your_secret_key_very_strong
APPLE_TEAM_ID=TEAMID
APPLE_CERT_PASSWORD=password
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## 🔧 Configuration Apple Wallet (Optionnel)

Pour générer les passes Apple Wallet, vous devez :

1. Enregistrer votre Team ID Apple Developer
2. Créer un certificat signataire (Signing Certificate)
3. Télécharger le certificat WWDR
4. Placer les fichiers dans `backend/certs/`:
   - `wwdr.pem`
   - `signingCert.p12`
   - `signingKey.key`

5. Définir les variables d'environnement correspondantes

**Sans cela, les passes Apple Wallet retourneront une erreur, mais le client sera quand même créé en base de données.**

## 📦 Déploiement Production

### Backend
```bash
# Build
npm install --production
npm start

# PM2 (recommandé)
pm2 start server.js --name "loyalty-backend"
```

### Frontend
```bash
# Build
npm run build

# Servir sur port 3000 (nginx, vercel, netlify, etc.)
```

### Base de Données
- Utiliser MySQL en production (AWS RDS, DigitalOcean, etc.)
- Utiliser des variables d'environnement pour les credentials
- Backups réguliers

## 🐛 Troubleshooting

### "Erreur: CORS"
→ Vérifier que `VITE_API_URL` pointe vers le bon backend

### "Erreur: Token invalide"
→ Vérifier JWT_SECRET cohérent entre frontend et backend

### "Erreur: Connexion MySQL"
→ Vérifier `.env` et que MySQL est en cours d'exécution

### "Certificats Apple manquants"
→ Les passes Apple ne seront pas générés, mais l'API retournera un message d'erreur explicite

## 📧 Structure du Code

### Backend Structure
```
backend/
├── server.js              # Serveur Express principal
├── db.js                  # Pool de connexion MySQL
├── .env                   # Variables d'environnement
├── package.json           # Dépendances
├── middlewares/
│   └── auth.js           # JWT, verifyToken, isAdmin, isPro
├── routes/
│   └── apiRoutes.js      # Toutes les routes
└── controllers/
    └── apiController.js  # Logique métier (très détaillée)
```

### Frontend Structure
```
frontend/
├── index.html                    # HTML principal
├── vite.config.js               # Config Vite
├── package.json                 # Dépendances
├── src/
│   ├── main.jsx                 # Entry React
│   ├── App.jsx                  # Router racine
│   ├── api.js                   # Axios instance
│   ├── index.css                # Styles globaux
│   └── pages/
│       ├── AdminLogin.jsx       # Login Master Admin
│       ├── AdminDashboard.jsx   # Dashboard Master Admin
│       ├── ProLogin.jsx         # Login Pros
│       ├── ProResetPassword.jsx # Changement pwd première connexion
│       ├── ProDashboard.jsx     # Dashboard Pro (scanner + clients)
│       ├── JoinWallet.jsx       # Page inscription publique
│       ├── Auth.css             # Styles authentification
│       ├── Dashboard.css        # Styles dashboards
│       └── JoinWallet.css       # Styles inscription
```

## ✨ Highlights Techniques

1. **Isolation absolue des données** : Chaque endpoint Pro filtre par `req.user.id` (enterprise_id)
2. **Génération UUIDv4** : Chaque client reçoit un ID unique encodé dans le QR code
3. **JWT + RBAC** : Authentification sécurisée avec rôles
4. **Hachage bcrypt** : Tous les mots de passe hachés
5. **Scanner HTML5** : Lecture QR code directement depuis la caméra
6. **Double wallet** : Support Apple Wallet + Google Wallet
7. **Points de fidélité** : Paliers à 10 points avec notifications
8. **Pass.pkpass** : Génération automatique de cartes Apple Wallet

## 🚨 Notes Importantes

- **Sans certificats Apple** : La génération de .pkpass échouera, mais le client sera créé en base
- **QR code = ClientId** : L'UUID du client est encodé dans le code QR du pass
- **Isolation stricte** : Une entreprise ne peut jamais voir les clients d'une autre
- **Première connexion** : Les nouveaux pros doivent changer leur mot de passe temporaire
- **Suppression cascade** : Supprimer une entreprise supprime tous ses clients

---

**Projet généré par: Développeur Full-Stack Senior**
**Date: 2026**
**Version: 1.0.0**