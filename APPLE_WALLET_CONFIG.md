# Configuration Apple Wallet

## 📋 Prérequis

1. **Apple Developer Account** (inscription sur developer.apple.com)
2. **Team ID** (visible dans votre compte developer)
3. **Certificats** :
   - Pass Type ID Certificate (.p12)
   - WWDR Intermediate Certificate (.pem)
   - Private Key (.key)

## 🔧 Étapes de Configuration

### 1. Créer un Pass Type ID sur Apple Developer

1. Aller sur **Certificates, Identifiers & Profiles**
2. Cliquer sur **Identifiers**
3. Sélectionner **Pass Type IDs**
4. Cliquer sur le **+** à côté de "Register a new identifier"
5. Choisir **Pass Type ID**
6. Remplir le formulaire :
   - Description: "Loyalty Card Pass"
   - Identifier: `pass.com.example.loyalty` (modifier "example" par votre domaine)
7. Cliquer sur **Continue** puis **Register**

### 2. Générer un Signing Certificate

1. Dans **Certificates**, cliquer sur le **+**
2. Sélectionner **Apple Wallet Certificate**
3. Choisir votre **Pass Type ID** créé précédemment
4. Télécharger le fichier `.cer`
5. Le convertir en `.p12` :
   ```bash
   # Sur Mac
   openssl x509 -inform DER -outform PEM -in certificate.cer -out certificate.pem
   openssl pkcs12 -export -out pass.p12 -in certificate.pem
   ```

### 3. Télécharger WWDR Certificate

1. Aller sur **Certificates**
2. Télécharger **Apple Worldwide Developer Relations Intermediate Certificate**
3. Le convertir en `.pem` si nécessaire

### 4. Configurer le Backend

Placer les fichiers dans `backend/certs/` :
```
backend/certs/
├── wwdr.pem              # WWDR Certificate
├── signingCert.p12       # Signing Certificate
└── signingKey.key        # Private Key (extraire de .p12)
```

Pour extraire la clé privée du .p12 :
```bash
openssl pkcs12 -in signingCert.p12 -nocerts -nodes -out signingKey.key
```

### 5. Configurer les Variables d'Environnement

Éditer `backend/.env` :
```env
APPLE_TEAM_ID=XXXXXXXXXX          # Votre Team ID
APPLE_CERT_PASSWORD=mypassword     # Password du .p12
```

### 6. Tester

Accéder à `/join/:entrepriseId` et choisir "Apple Wallet".
Si tout est configuré, le `.pkpass` sera généré et téléchargé.

## 🐛 Troubleshooting

### "Error: ENOENT: no such file or directory"
→ Vérifier que les fichiers sont dans `backend/certs/`

### "Error: certificate not recognized"
→ Vérifier les formats des certificats (PEM, p12, key)

### "Error: Unknown content type for content"
→ Le contenu du fichier n'est pas au bon format

### Le pass se génère mais n'ouvre pas
→ Vérifier que `passTypeIdentifier` correspond à votre Pass Type ID Apple

## 📱 Tester le Pass

1. Sur iPhone, ouvrir le `.pkpass` téléchargé
2. Cliquer sur "Ajouter"
3. Le pass s'ajoute à Wallet

## 🔔 Notifications Push (Avancé)

Pour mettre à jour les passes remotement avec APNs :

```javascript
// Dans handleScan après détection du palier de 10 points
const apnToken = client.apn_device_token; // À stocker lors de la création
const pushPayload = {
  aps: {
    alert: "Vous avez atteint 10 points !",
    badge: 1,
    sound: "default"
  }
};

// POST vers Apple APNs avec JWT signé
```

## 📚 Ressources Utiles

- [Apple Developer Wallet Documentation](https://developer.apple.com/wallet/)
- [passkit-generator Documentation](https://npmjs.com/package/passkit-generator)
- [Pass Type ID Setup Guide](https://developer.apple.com/documentation/walletpasses)

---

**Note** : Sans ces certificats, la génération de passes Apple Wallet échouera, mais le système continuera de fonctionner pour Google Wallet et pour la gestion manuelle des clients.
