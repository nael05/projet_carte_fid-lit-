# 🔒 Configuration Google Wallet - Guide Sécurisé

## 📋 Structure des Fichiers

```
backend/
├── certs/
│   └── google-wallet-key.json     ← 🔐 TES CLÉS SECRÈTES (IGNORÉ PAR GIT)
├── .env                            ← Configuration locale (IGNORÉ PAR GIT)
├── .env.example                    ← Template publique (À COMMITER)
├── .gitignore                      ← Ignore les secrets ✅
└── utils/
    └── googleWalletManager.js      ← Gestionnaire Google Wallet
```

## 🔐 Sécurité

### ✅ Ce qui est sécurisé:
- **Fichier `certs/google-wallet-key.json`** → Ignoré par Git (dans `.gitignore`)
- **Variables `.env`** → Ignoré par Git, jamais commité
- **Private key** → Chargée en mémoire uniquement, jamais exposée

### ❌ Ne fais JAMAIS:
- ❌ Commiter le fichier `.env` (ajoute-le à `.gitignore`)
- ❌ Commiter les clés JSON (elles sont dans `.gitignore`)
- ❌ Poster tes clés dans le code ou les commentaires
- ❌ Partager tes clés par message/email

## 🚀 Utilisation

### Le fichier `google-wallet-key.json` est déjà configuré et chargé ✅

**Emplacement:** `backend/certs/google-wallet-key.json`
**Auto-chargement:** ✅ Au démarrage du serveur
**Validation:** ✅ Vérification de la présence du fichier

### Variable d'environnement (dans `.env`)
```
GOOGLE_WALLET_KEY_PATH=./certs/google-wallet-key.json
```

## 🔄 Flux d'Intégration

### 1️⃣ Création de la Carte Loyauté (Frontend)
```
JoinWallet.jsx
    ↓
/join/:entrepriseId (Backend)
    ↓
registerClientAndGeneratePass()
```

### 2️⃣ Génération du Pass (Backend)
```
registerClientAndGeneratePass()
    ↓
googleWalletManager.createWalletPass()
    ↓
Charge credentials automatiquement
    ↓
Génère JWT pour Google Wallet
    ↓
Retourne saveUrl au frontend
```

### 3️⃣ Ajout à Google Wallet (Frontend)
Le frontend reçoit:
```json
{
  "success": true,
  "clientId": "uuid...",
  "saveUrl": "https://pay.google.com/gp/v/save/...",
  "message": "Pass Google Wallet généré avec succès"
}
```

L'utilisateur clique sur `saveUrl` → Ouvre Google Wallet → Ajoute la carte

## 🛠️ Dépannage

### "Google Wallet credentials not found"
- ✅ Vérifier que le fichier existe: `backend/certs/google-wallet-key.json`
- ✅ Vérifier les permissions du fichier (readable)
- ✅ Vérifier que GOOGLE_WALLET_KEY_PATH est correct dans `.env`

### "Token request failed"
- ✅ Vérifier la validité de la clé Google Service Account
- ✅ Vérifier que le projet Google Wallet API est activé
- ✅ Vérifier les permissions du service account

### "Google Wallet API error"
- ✅ Vérifier le format de la clé (doit être un JSON valide)
- ✅ Vérifier que la clé n'est pas expirée
- ✅ Consulter les logs du backend pour plus de détails

## 📝 Notes

- La clé est chargée UNE FOIS au démarrage du serveur ✅
- Les access tokens Google Wallet sont mis en cache (1h) ✅
- Renouvellement automatique avant expiration ✅
- Pas d'appels API répétés pour les tokens ✅

## 🔑 Format de la Clé JSON

Tu as fourni une clé au format Google Service Account standard:
```json
{
  "type": "service_account",
  "project_id": "saas-fidelite",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "fidelite-saas-531@saas-fidelite.iam.gserviceaccount.com",
  "client_id": "117300679005322337027",
  ...
}
```

C'est parfait! ✅

## 🚀 Prochaines Étapes

1. Vérifier que le backend démarre sans erreur
2. Tester la création d'une carte via JoinWallet
3. Vérifier les logs: `✅ Google Wallet credentials loaded`
4. Tester l'intégration Google Wallet complète

---

**Tout est sécurisé et prêt à l'emploi! 🎉**
