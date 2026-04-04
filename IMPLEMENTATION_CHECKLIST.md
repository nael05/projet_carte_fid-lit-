# ✅ Système de Fidélité - Checklist Configuration

## Étape 1: Appliquer la migration ✓
- [x] Migration SQL créée: `migration-loyalty-system.sql`
- [x] Script de migration créé: `backend/migrate-loyalty.js`

**À faire :**
```bash
cd c:\wamp64\www\projet_carte_fid-lit-\backend
node migrate-loyalty.js
```

## Étape 2: Frontend Configuration ✓
- [x] AdminDashboard.jsx - Choix type de fidélité à la création d'entreprise
- [x] LoyaltySettings.jsx - Configuration complète des paramètres
- [x] PushNotifications.jsx - Interface pour envoyer notifications
- [x] ProDashboard.jsx - Intégration des nouveaux onglets

## Étape 3: Backend API ✓
- [x] loyaltyController.js - Tous les contrôleurs pour fid\u00e9lit\u00e9
- [x] Endpoints mise à jour pour gérer Points ET Tampons
- [x] Transactions historisées
- [x] Support des notifications push

## Étape 4: À Faire - Clés de Configuration 🔑

**CRUCIAL** : Sans ces clés, vous ne pourrez pas utiliser les wallets !

### 1. Obtenir la clé Apple Wallet
1. Aller sur https://developer.apple.com
2. Créer une identité de pass (Pass Type ID)
3. Obtenir le certificat et la clé
4. Copier dans le dashboard Pro → ⚙️ Fidélité → "Clé Apple Wallet"

### 2. Obtenir la clé Google Wallet
1. Aller sur https://console.cloud.google.com
2. Créer un nouveau projet
3. Générer une clé de service (Service Account Key)
4. Télécharger le JSON
5. Copier dans le dashboard Pro → ⚙️ Fidélité → "Clé Google Wallet"

## Étape 5: Tester le Système

### Test 1: Créer une entreprise
1. Admin → Créer une entreprise
2. Choisir le mode "🎯 Système de Points" OU "🎫 Système de Tampons"
3. Vérifier la création

### Test 2: Configurer la fidélité
1. Se connecter comme Pro
2. Aller à l'onglet "⚙️ Fidélité"
3. Passer en mode édition
4. Configurer les paramètres
5. Ajouter les clés Apple et/ou Google
6. Enregistrer

### Test 3: Scanner un client
1. Créer un client pour l'entreprise
2. Générer son QR code
3. Scanner le QR code depuis Pro Dashboard
4. Vérifier que les points/tampons augmentent

### Test 4: Notifications Push
1. Aller dans "📢 Notifications"
2. Créer une notification
3. Choisir les destinataires
4. Envoyer
5. Consulter l'historique

## Étape 6: Intégration Apple et Google (en arrière-plan)

**À implémenter** : Les appels API réels pour push les modifications

### Apple APNs
- Endpoint: `POST https://api.push.apple.com/3/device/{deviceToken}`
- Auth: JWT signé avec le certificat

### Google Wallet API
- Endpoint: `POST https://walletobjects.googleapis.com/walletobjects/v1/pass/{classId}/instances`
- Auth: Service Account OAuth

## Fichiers Modifiés

### Backend
- ✓ `backend/controllers/loyaltyController.js` (nouveau)
- ✓ `backend/controllers/apiController.js` (créer/scanner)
- ✓ `backend/routes/apiRoutes.js` (nouveaux endpoints)
- ✓ `backend/migrate-loyalty.js` (nouveau)
- ✓ `migration-loyalty-system.sql` (nouveau)

### Frontend
- ✓ `frontend/src/pages/AdminDashboard.jsx`
- ✓ `frontend/src/pages/ProDashboard.jsx`
- ✓ `frontend/src/pages/LoyaltySettings.jsx` (nouveau)
- ✓ `frontend/src/pages/PushNotifications.jsx` (nouveau)

## Commandes Utiles

```bash
# Appliquer la migration
cd backend && node migrate-loyalty.js

# Redémarrer le backend
npm run dev

# Noter les erreurs d'application de migration
# -> Consultez migrate-loyalty.js pour déboguer

# Vérifier la DB après migration
mysql -u root loyalty_saas
SHOW TABLES;
DESCRIBE loyalty_config;
```

## Points Clés à Retenir

1. **Max 10 tampons** - C'est une limite du système
2. **Clés obligatoires** - Obtenir Apple et Google sinon les wallets ne fonctionnent pas
3. **Deux modes** - Une entreprise choisit UN SEUL mode à la création
4. **Points/Tampons configurables** - Chaque entre prise peut configurer ses propres paramètres
5. **Historique complet** - Toutes les transactions sont tracées
6. **Notifications** - Les clients peuvent être notifiés à tout moment

## ✨ Prêt!

Une fois la migration appliquée, votre système est prêt à l'emploi !
N'oubliez pas les clés Apple et Google pour une expérience complète.
