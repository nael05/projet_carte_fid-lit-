# ✅ APPLE WALLET BACKEND - CHECKLIST DE CONFIGURATION

## 🎯 Phase 1: Obtenir les Certificats Apple

### Pré-requis
- [ ] Compte Apple Developer actif (+$99/an)
- [ ] Accès aux Certificates dans Developer Portal

### Certificat Pass Type ID (PKCS#12)
- [ ] Se connecter à https://developer.apple.com/account/
- [ ] Aller à Certificates
- [ ] Créer un nouveau "Pass Type ID Certificate"
- [ ] Format: télécharger en PKCS#12 (.p12)
- [ ] Sauvegarder le mot de passe (ou laisser vide et rappuyer)
- [ ] **Placer le fichier dans:** `backend/certs/apple-wallet-cert.p12`

### Certificat WWDR (Apple Worldwide Developer Relations CA - G4)
- [ ] Aller à https://developer.apple.com/account/resources/certificates/list
- [ ] Chercher: "Apple Worldwide Developer Relations CA - G4"
- [ ] Télécharger en format `.cer`
- [ ] **Placer le fichier dans:** `backend/certs/AppleWWDRCA.cer`

### Clé APNs (P8)
- [ ] Aller à Keys dans Developer Portal
- [ ] Créer une nouvelle clé
- [ ] Sélectionner service: "Apple Push Notifications service (APNs)"
- [ ] Télécharger le fichier P8
- [ ] Mémoriser le Key ID
- [ ] Mémoriser le Team ID
- [ ] **Placer le fichier dans:** `backend/certs/AuthKey_XXXXXXXXXX.p8`

### Passe Type ID (ID de votre pass)
- [ ] Aller à Identifiers > Pass Types
- [ ] Créer un nouveau Pass Type ID
- [ ] Format recommandé: `pass.com.yourcompany.loyaltycard`
- [ ] **Mémoriser cet ID:** Il va dans `.env`

---

## 🔧 Phase 2: Configuration Backend

### Installation des dépendances
- [ ] Exécuter: `cd backend && npm install`
- [ ] Vérifier que `apn` est installé: `npm list apn`

### Créer les dossiers requis
```bash
mkdir -p backend/passes      # Cache pour les fichiers .pkpass générés
mkdir -p backend/logs        # Logs Apple Wallet
```

### Fichier .env (remplir les variables)
```bash
cp backend/.env.example backend/.env
```

Remplir les champs:
```env
# ===== APPLE WALLET =====
APPLE_TEAM_ID=XXXXXXXXXX                          # De Developer Account
APPLE_PASS_TYPE_ID=pass.com.yourcompany.loyalty  # Que você créé
APPLE_CERT_PATH=./certs/apple-wallet-cert.p12
APPLE_CERT_PASSWORD=                              # Laisser vide si pas de mdp

# ===== APPLE WWDR =====
APPLE_WWDR_CERT_PATH=./certs/AppleWWDRCA.cer

# ===== APPLE PUSH NOTIFICATIONS =====
APPLE_APN_KEY_PATH=./certs/AuthKey_XXXXXXXXXX.p8  # Filename exact  
APPLE_APN_KEY_ID=XXXXXXXXXX                       # De la clé créée
APPLE_APN_TEAM_ID=XXXXXXXXXX                      # Same as APPLE_TEAM_ID
APPLE_APN_ENVIRONMENT=development                 # switch to 'production' later

# ===== CRITICAL: WEB SERVICE URL =====
APPLE_WALLET_WEBSERVICE_URL=https://yourdomain.com/api  # MUST BE HTTPS!
```

### Vérifier les certificats
```bash
# Lister les certificats
ls -lah backend/certs/

# Test OpenSSL (vérifier que cert n'est pas corrompu)
openssl pkcs12 -in backend/certs/apple-wallet-cert.p12 -info -noout
# Devrait afficher les infos du cert sans erreur

# Test clé P8
openssl pkey -in backend/certs/AuthKey_XXXXXXXXXX.p8 -text -noout
# Devrait afficher la clé sans erreur
```

---

## 💾 Phase 3: Base de Données

### Appliquer les migrations
```bash
# Option 1: Via MySQL CLI
mysql -u root -p loyalty_saas < backend/migrations/add-apple-wallet-tables.sql

# Option 2: Via Node.js (si tu as un script)
cd backend && npm run apply-migrations

# Option 3: Copier-coller le SQL dans phpMyAdmin si tu utilises WAMP
```

### Vérifier les tables créées
```bash
# Se connecter à la BD
mysql -u root -p loyalty_saas

# Vérifier les tables
SHOW TABLES;
# Devrait afficher:
# - wallet_cards
# - apple_pass_registrations
# - pass_update_logs

# Vérifier les colonnes
DESC wallet_cards;
DESC apple_pass_registrations;
DESC pass_update_logs;
```

---

## ✅ Phase 4: Démarrage & Vérification

### Starterer le serveur
```bash
cd backend
npm run dev
```

Chercher ces logs de succès:
```
✅ Configuration Apple Wallet validée
✅ Provider APNs initialisé (development)
✅ Backend démarré sur http://localhost:5000
```

### Tester l'endpoint santé
```bash
curl http://localhost:5000/health
# Response: { "status": "OK", "database": "connected" }
```

### Test de création de pass

```bash
# 1. Login en tant que Pro pour avoir un JWT token
curl -X POST http://localhost:5000/api/pro/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pro@test.com","password":"password123"}' \
  > login.json

# 2. Extraire le token
TOKEN=$(cat login.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo $TOKEN

# 3. Créer un pass pour un client existant
curl -X POST http://localhost:5000/api/app/wallet/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clientId":1}' \
  > test.pkpass

# 4. Vérifier le fichier
file test.pkpass
# Devrait dire: data (PK archive)

# 5. Vérifier la BD
mysql -e "SELECT * FROM wallet_cards WHERE client_id = 1;" loyalty_saas
```

---

## 🔄 Phase 5: Test Complet (Optionnel en Dev)

### Test local sans iOS

```bash
# 1. Créer un pass
curl http://localhost:5000/api/app/wallet/create \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"clientId":1}' \
  -o test.pkpass

# 2. Vérifier le contenu du .pkpass (c'est un ZIP)
unzip -l test.pkpass
# Devrait lister: manifest.json, pass.json, signature, images/...

# 3. Vérifier pass.json
unzip -p test.pkpass pass.json | jq .
# Devrait afficher la structure correcte avec:
# - webServiceURL
# - authenticationToken
# - serialNumber
# - barcode avec QR

# 4. Ajouter des points
curl -X POST http://localhost:5000/api/app/wallet/add-points \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": 1,
    "pointsToAdd": 5,
    "reason": "Test"
  }'
# Response: { "success": true, "oldBalance": 0, "newBalance": 5, "notificationsSent": 0 }
# notificationsSent = 0 è normal (pas d'appareil enregistré en dev)

# 5. Vérifier BD
mysql -e "SELECT * FROM pass_update_logs WHERE pass_serial_number LIKE '%';" loyalty_saas
# Devrait montrer les entrées add_points
```

---

## 🚀 Phase 6: Déploiement Production

### Avant de passer en production

- [ ] Tester sur iOS réel avec certificate en development
- [ ] Basculer `APPLE_APN_ENVIRONMENT=production`
- [ ] Obtenir certificat Apple pour environment production (HTTPS obligatoire)
- [ ] Mettre à jour `APPLE_WALLET_WEBSERVICE_URL` avec domaine production
- [ ] Tester à nouveau sur iOS réel

### Checklist déploiement

- [ ] Tous les certificats placés sur serveur production
- [ ] `.env` configuré correctement sur production
- [ ] BD migré sur production
- [ ] Certificats en `.pem` ou `.p12` si utilisation Docker/containerization
- [ ] Logs Cloudwatch/ELK configurés pour monitorer
- [ ] Backup BD + certificats
- [ ] Test petit achat/points en production
- [ ] Monitoring APNs failures

---

## 🐛 Troubleshooting

### Problème: "CERTIFICAT MANQUANT"
```
❌ CERTIFICAT MANQUANT: ./certs/apple-wallet-cert.p12
```
**Solution:**
```bash
ls -lah backend/certs/
# Vérifier que les 3 fichiers existent:
# - apple-wallet-cert.p12
# - AppleWWDRCA.cer
# - AuthKey_XXXXXXXXXX.p8
```

### Problème: "Invalid authentication token"
```
⚠️ Authentification échouée: serial=ABC..., token=...
401 Invalid authentication token
```
**Solution:**
- Vérifier que le token envoyé par Apple Wallet = token stocké en BD
- Vérifier que le serial number est correct
- Vérifier que `apple_pass_registrations` a le token

### Problème: "Content-Type application/vnd.apple.pkpass not recognized"
```
Your app or passcode isn't eligible for Wallet at this time
```
**Solution:**
- Vérifier que les headers HTTP sont corrects:
  ```
  Content-Type: application/vnd.apple.pkpass
  ```
- Vérifier que le fichier .pkpass n'est pas 0 byte
- Vérifier que la signature est valide

### Problème: APNs notifications ne passent pas
```
❌ Notification échouée (token=...): Raison inconnue
```
**Solutions:**
1. Vérifier que `APPLE_APN_ENVIRONMENT` est correct (development vs production)
2. Vérifier que la clé P8 est correcte: `APPLE_APN_KEY_PATH`
3. Vérifier Token APNs valide (peut expirer)
4. Vérifier que topic = passType ID: `APPLE_PASS_TYPE_ID`

---

## 📞 Support

Fichiers pour le debug:
- 🎯 Vérifier: `IMPLEMENTATION_GUIDE_APPLE_WALLET.md`
- 📋 Plan original: `PLAN_APPLE_WALLET_INTEGRATION.md`
- 🔍 Code: `backend/utils/passGenerator.js`

Si bug, chercher dans les logs:
```bash
npm run dev 2>&1 | grep -E "❌|❗|Error"
```

---

**Status Final:** ✅ Prêt à configurer!  
**Suivre les phases dans l'ordre.**
