# 🎯 Système de Fidélité Complet - Guide de Configuration

## 📋 Vue d'ensemble

Ce système de fidélité offre deux modes au choix :
- **🎯 Points** : Accumulation de points à chaque achat
- **🎫 Tampons** : Système de tampons physiques à remplir

## ⚙️ Installation

### 1. Appliquer la migration de la base de données

```bash
cd backend
node migrate-loyalty.js
```

Cela créera automatiquement :
- Colonnes de fidélité sur la table `entreprises`
- Table `loyalty_config` pour la configuration détaillée
- Table `customer_stamps` pour tracker les tampons
- Table `push_notifications_sent` pour l'historique
- Table `transaction_history` pour l'audit

### 2. Redémarrer le serveur backend

```bash
npm run dev
```

## 🚀 Utilisation

### Configuration d'une nouvelle entreprise

**Pour l'admin (master-admin-secret) :**

1. Aller dans le dashboard d'administration
2. Créer une nouvelle entreprise
3. **Choisir le mode de fidélité :**
   - Option 1: `🎯 Système de Points`
   - Option 2: `🎫 Système de Tampons`
4. L'entreprise recevra les identifiants par email

### Configuration d'une entreprise (côté Pro)

Dans le dashboard Pro, allez à l'onglet **⚙️ Fidélité** :

#### Mode Points
- **Points par achat** : Nombre de points ajoutés à chaque scan (défaut: 1)
- **Points pour récompense** : Nombre de points pour débloquer une récompense (défaut: 10)

#### Mode Tampons
- **Total de tampons** : Nombre de tampons visibles sur la carte (défaut: 10, max: 10)
- **Tampons par achat** : Nombre de tampons à donner par scan (défaut: 1)
- **Tampons pour récompense** : Nombre de tampons pour débloquer une récompense (défaut: 10)

#### Configuration générale
- **Titre de récompense** : Titre visible quand la récompense est débloquée
- **Description** : Description complète de la récompense
- **Clé Apple Wallet** : À obtenir depuis Apple Developer
- **Clé Google Wallet** : À obtenir depuis Google Cloud Console
- **Notifications push** : Activer/désactiver les notifications

## 📱 Endpoints API

### Configuration de fidélité
```http
GET /api/pro/loyalty/config
PUT /api/pro/loyalty/config
```

### Tampons (système de tampons uniquement)
```http
POST /api/pro/stamps/add/{clientId}
POST /api/pro/stamps/claim/{clientId}
```

### Notifications push
```http
POST /api/pro/notifications/send
GET /api/pro/notifications/history
GET /api/pro/notifications/{notificationId}
```

## 🔑 Clés Apple et Google

### Apple Wallet
1. Aller sur [Apple Developer](https://developer.apple.com)
2. Créer une identité de pass (Pass Type ID)
3. Obtenir la clé et le certificat
4. Stocker la clé dans la configuration

### Google Wallet
1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un projet Google Wallet
3. Générer une clé de service (Service Account Key)
4. Copier la clé JSON

## 📊 Management des clients

### Liste des clients (👥 Clients)
- Affiche le statut de fidélité selon le mode
- Pour Points: colonne "Points"
- Pour Tampons: colonne "Tampons" (ex: "3/10")

### Ajustement manuel
- Boutons +1 et -1 pour ajuster manuellement
- Utile pour les erreurs ou les transactions offline

## 📢 Notifications Push

Dans l'onglet **📢 Notifications** :

1. **Créer une notification**
   - Titre : ex "Promotion du jour"
   - Message : ex "Profitez de 20% de réduction aujourd'hui"
   - Cible : Tous les clients ou un segment spécifique

2. **Segments disponibles**
   - 📧 Tous les clients
   - 🟢 Clients actifs (avec points/tampons)
   - 🔴 Clients inactifs (0 point/tampon)

3. **Historique**
   - Consultez toutes les notifications envoyées
   - Statut: brouillon, envoyée, planifiée, etc.

## 📈 Statistiques

Un endpoint `/pro/loyalty/stats` est disponible pour obtenir :
- Nombre total de clients
- Moyenne/Max de points ou tampons
- Total de points/tampons accordés
- Nombre de récompenses réclamées

## 🔒 Sécurité et validation

- Chaque opération est isolée par entreprise
- Les clients sont validés pour chaque opération
- Les transactions sont enregistrées dans l'historique
- Les notifications push sont tracées par client

## ⚠️ Notes importantes

1. **MAX TAMPONS = 10** : Le système limite à 10 tampons par carte
2. **Les clés Apple et Google** : À obtenir OBLIGATOIREMENT pour le wallet
3. **Historique** : Tous les changements sont enregistrés dans `transaction_history`
4. **Notifications** : Utilisez le système de segments pour cibler efficacement

## 🐛 Dépannage

### La migration échoue
```bash
# Vérifier la connexion MySQL
mysql -u root -p loyalty_saas

# Relancer la migration
node migrate-loyalty.js
```

### Les tampons ne s'affichent pas
- Vérifier que `loyalty_type = 'stamps'` dans la table `loyalty_config`
- Vérifier que le client a été crée après la migration

### Les notifications ne s'envoient pas
- Vérifier que `push_notifications_enabled = true`
- Vérifier que les clés Apple/Google sont configurées
- Consulter les logs du serveur backend

## 📞 Support

Pour toute question ou problème, consultez les logs du serveur :
```bash
# Terminal backend
npm run dev
# Cherchez les messages d'erreur en rouge
```
