# Architecture Frontend - Guide Détaillé

## 📁 Structure Fichiers

```
frontend/
├── index.html                 # HTML de base (appel main.jsx)
├── vite.config.js            # Configuration Vite
├── package.json              # Dépendances (React, Vite, router, axios, etc)
├── .env                       # VITE_API_URL
├── .gitignore               # node_modules, dist
└── src/
    ├── main.jsx             # Entry point React (ReactDOM.render App)
    ├── App.jsx              # Router racine (BrowserRouter + Routes)
    ├── api.js               # Instance Axios + token interceptor
    ├── index.css            # Styles globaux
    └── pages/
        ├── Auth.css                    # Styles login/password
        ├── Dashboard.css               # Styles dashboards + tables
        ├── JoinWallet.css              # Styles inscription client
        ├── AdminLogin.jsx              # Login Master Admin
        ├── AdminDashboard.jsx          # Dashboard Master Admin
        ├── ProLogin.jsx                # Login Pro
        ├── ProResetPassword.jsx        # Change password (1ère connexion)
        ├── ProDashboard.jsx            # Dashboard Pro (3 onglets)
        └── JoinWallet.jsx              # Inscription client public
```

## 🔌 Points d'Entrée

### main.jsx
```javascript
// Entry point de React
// Crée le root et monte App.jsx
// Importe index.css (styles globaux)
```

### App.jsx
```javascript
// BrowserRouter + Routes définit le routage global
// 6 routes principales:
// 1. /master-admin-secret logging
// 2. /master-admin-secret/dashboard
// 3. /pro/login
// 4. /pro/reset-password
// 5. /pro/dashboard
// 6. /join/:entrepriseId (public)
```

### api.js
```javascript
// Instance Axios pré-configurée
// - baseURL pointant vers VITE_API_URL
// - Intercepteur: ajoute le token au header Authorization
// - Automatique pour toutes les requêtes
```

## 🎨 Composants & Pages

### 1. AdminLogin.jsx
**Route:** `/master-admin-secret`
**Non-authentifié** (public)

```javascript
// Formulaire: identifiant + mot de passe
// Envoie: POST /api/admin/login
// Reçoit: token
// Sauvegarde: localStorage.setItem('token')
// Redirige: /master-admin-secret/dashboard
```

### 2. AdminDashboard.jsx
**Route:** `/master-admin-secret/dashboard`
**Authentifié** (admin seulement)

```javascript
// État local:
// - nom, email (inputs de formulaire)
// - created (réponse de création)
// - error (messages d'erreur)

// Formulaire: nom + email
// POST /api/admin/create-company
//   → Reçoit: { companyId, email, temporaryPassword }
//   → Affiche les identifiants à copier

// Bouton: Déconnexion
//   → localStorage.clear()
//   → Redirige vers /master-admin-secret
```

### 3. ProLogin.jsx
**Route:** `/pro/login`
**Non-authentifié** (public)

```javascript
// Formulaire: email + mot de passe
// Envoie: POST /api/pro/login
// Reçoit: { token, mustChangePassword, companyId, nom }
// Sauvegarde:
//   - localStorage.token
//   - localStorage.companyId
//   - localStorage.companyName
// Logique:
//   - Si mustChangePassword = TRUE → /pro/reset-password
//   - Sinon → /pro/dashboard
```

### 4. ProResetPassword.jsx
**Route:** `/pro/reset-password`
**Authentifié** (token requis mais pas à first login)

```javascript
// Force le changement de password à première connexion
// Formulaire: newPassword + confirmPassword
// Validations:
//   - Min 6 caractères
//   - Passwords match
// Envoie: PUT /api/pro/change-password
// Reçoit: { success: true }
// Redirige: /pro/dashboard (avec délai de 1500ms)
```

### 5. ProDashboard.jsx
**Route:** `/pro/dashboard`
**Authentifié** (token requis)

```javascript
// Le composant le plus complexe !
// Structure: 3 onglets (tabs)

// ONGLET 1: Scanner QR
//   - Initialise html5-qrcode
//   - Caméra: 256x256px QR box
//   - On scan → POST /api/pro/scan
//   - Reçoit: newPoints, clientName, rewardUnlocked
//   - Affiche alert: "Point ajouté pour [NAME] !"
//   - Si palier atteint → énorme notification "🎉 Récompense"

// ONGLET 2: Clients
//   - GET /api/pro/clients → liste table
//   - Colonnes: Nom, Téléphone, Points, Wallet, Actions
//   - Boutons +1 et -1 pour chaque client
//   - PUT /api/pro/adjust-points/:clientId

// ONGLET 3: Configuration
//   - GET /api/pro/info → recompense_definition
//   - Mode "lecture": affiche le texte
//   - Mode "édition": textarea
//   - PUT /api/pro/update-reward

// useEffect:
//   - Au montage: vérifie le token (sinon redirects /pro/login)
//   - loadClients() au montage + après scan/adjustment
//   - loadReward() au montage + après update
//   - Scanner init/destroy selon l'onglet actif

// State:
//   - activeTab: "scanner" | "clients" | "config"
//   - clients: array
//   - scannerActive: bool
//   - lastScan: { success, clientName, points, error }
//   - reward: reward text si palier atteint
//   - rewardText: editable text
//   - editingReward: bool
//   - loading: bool
```

### 6. JoinWallet.jsx
**Route:** `/join/:entrepriseId`
**Non-authentifié** (public)

```javascript
// useParam: { entrepriseId } depuis URL
// useEffect:
//   - GET /api/companies/:entrepriseId/info
//   - Récupère: { id, nom, recompense_definition }
//   - Si 404 → montre erreur

// Formulaire: nom + prenom + telephone + type_wallet
// Select: "Apple Wallet" ou "Google Wallet"
// Envoie: POST /api/join/:entrepriseId
// Réponse Apple:
//   - Response = Blob (fichier .pkpass)
//   - Crée URL temporaire
//   - Déclenche téléchargement automatique
//   - Utilisateur ajoute au wallet
// Réponse Google:
//   - Response JSON avec clientId
// Après succès:
//   - Affiche page "Carte créée !"
//   - Message: "Commencez à accumuler..."

// État:
//   - company: données entreprise
//   - form: nom, prenom, telephone, type_wallet
//   - loading: bool (bouton disabled pendant requête)
//   - error: string
//   - success: bool (change la vue)

// Isolation de l'interface:
//   - Espace PUBLIC - pas de branding "Loyalty"
//   - Branding entreprise = "Café du Coin"
//   - Design minimaliste et mobile-first
```

## 🎯 State Management

**→ AUCUN Redux/Context**
- Utilisation de `useState` et `useEffect`
- `localStorage` pour token + companyId
- Props drilling minimal (architecture plate)

## 🔐 Sécurité Frontend

### Token Management
```javascript
// Enregistrement
localStorage.setItem('token', response.data.token)

// Utilisation (automatique via api.js)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Suppression
localStorage.removeItem('token')
```

### Navigation Protégée
```javascript
// Si pas de token → redirect /pro/login
if (!localStorage.getItem('token')) {
  navigate('/pro/login')
}
```

## 🎨 Styles

### Global (index.css)
- Reset CSS
- Styles de base: button, input, select
- Font family: -apple-system
- Background: #f5f5f5

### Auth.css
- Container: gradient background
- Card: white box, centered, max-width 400px
- Buttons: primary (gradient), secondary, danger
- Error text: #d32f2f

### Dashboard.css
- Header: #667eea background
- Tabs: border-bottom sélection
- Table: thead avec #f5f5f5, tr:hover
- Alerts: success/error/info avec border-left
- Action buttons: petits boutons groupés

### JoinWallet.css
- Container: gradient (même que Auth)
- Card: white, max-width 450px
- Form fields: padding, border, focus style
- Reward info: left border #667eea
- Success state: green border, #f1f8f4 background

## 📱 Responsive Design

- Base: max-width 1200px pour dashboards
- Mobile: padding 20px, full-width cards
- Breakpoints: pas explicites (fluide)
- Textarea: 100% width sur input focus

## 🚀 Performance

- Code splitting: chaque page = fichier séparé
- Lazy loading: non utilisé (app assez petite)
- QR Scanner: init/destroy selon tab active (économise ressources)
- API calls: debounced? Non, déclenchés manuellement

## 🔄 Intégration API

### Modèle de Requête
```javascript
try {
  const response = await api.get('/endpoint')
  // OU
  const response = await api.post('/endpoint', data)
  // OU
  const response = await api.put('/endpoint', data)
  // OU
  const response = await api.delete('/endpoint')
  
  // Traiter response.data
  setState(response.data)
} catch (err) {
  // Afficher err.response?.data?.error
  setError(err.response?.data?.error || 'Erreur')
}
```

### Error Handling
- Toutes les requêtes sont en try/catch
- Affichage de message d'erreur (Alert ou Modal)
- Tokens invalides → redirige vers login

## 🧪 Tests Manuels

### Admin
1. Aller sur `/master-admin-secret`
2. Login avec identifiant + password
3. Créer entreprise
4. Copier password temporaire
5. Logout

### Pro
1. Aller sur `/pro/login`
2. Login avec email de l'entreprise créée
3. Popup: changer password
4. Confirmer
5. Alternative: /pro/dashboard devrait rediriger vers /pro/reset-password si mustChangePassword

### Scanner
1. Sur dashboard pro, onglet "Scanner QR"
2. Bouton "Démarrer le scanner"
3. Montrer QR code du client (stocké en base)
4. Scanner détecte → +1 point
5. À 10 points: huge notification "🎉"

### Clients
1. Onglet "Clients"
2. Vérifier liste clients
3. Boutons +1 et -1 pour ajuster points
4. Points recalculés à chaque click

### Config
1. Onglet "Configuration"
2. Voir texte récompense actuel
3. Cliquer "Modifier"
4. Changer le texte
5. Sauvegarder
6. Verified: texte mis à jour

### Join Wallet
1. Aller sur `/join/COMPANY_ID`
2. Remplir formulaire
3. Choisir wallet
4. Soumettre
5. Apple: téléchargement .pkpass
6. Google: page succès

---

**Last Update: 2026**
**Version: 1.0.0**
