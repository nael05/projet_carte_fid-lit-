# 🚀 Quick Start - Commandes à Exécuter

## 1️⃣ Appliquer la Migration (CRUCIAL!)

```bash
# Naviguer vers le backend
cd c:\wamp64\www\projet_carte_fid-lit-\backend

# Appliquer la migration
node migrate-loyalty.js
```

**Sortie attendue :**
```
🔄 Démarrage de la migration du système de fidélité...
📝 XXXX requêtes SQL à exécuter

✅ [1/XXXX] Requête exécutée
✅ [2/XXXX] Requête exécutée
...
✅ [XXXX/XXXX] Requête exécutée

=== RÉSUMÉ ===
✅ Succès: XXXX
❌ Erreurs: 0
🎉 Migration complète avec succès!
```

Si vous voyez des erreurs comme "ER_DUP_ENTRY", c'est normal si vous avez relancé la migration.

---

## 2️⃣ Redémarrer le Backend

```bash
# Dans le dossier backend
npm run dev
```

Vous devriez voir :
```
Backend démarré sur http://localhost:5000
```

---

## 3️⃣ Tester via Postman (Optionnel mais Recommandé)

### Login Admin
```
POST http://localhost:5000/api/admin/login
{
  "identifiant": "master_admin",
  "mot_de_passe": "YOUR_PASSWORD"
}
```

Copier le token retourné.

### Créer une Entreprise (Mode Points)

```
POST http://localhost:5000/api/admin/create-company
Headers:
  Authorization: Bearer {TOKEN}
  
Body:
{
  "nom": "Ma Boulangerie",
  "email": "boulangerie@example.com",
  "loyalty_type": "points"
}
```

### Créer une Entreprise (Mode Tampons)

```
POST http://localhost:5000/api/admin/create-company
Headers:
  Authorization: Bearer {TOKEN}
  
Body:
{
  "nom": "Mon Café",
  "email": "cafe@example.com",
  "loyalty_type": "stamps"
}
```

---

## 4️⃣ Vérifier la Base de Données (MySQL)

```bash
# Connexion à MySQL
mysql -u root -p loyalty_saas

# Vérifier les nouvelles tables
SHOW TABLES;

# Vérifier les colonnes de loyalty dans entreprises
DESCRIBE entreprises;

# Voir les configurations créées
SELECT * FROM loyalty_config;

# Voir les transactions
SELECT * FROM transaction_history;
```

---

## 5️⃣ Tester le Frontend

### Créer une Entreprise depuis Admin Dashboard
1. Aller à `http://localhost:5173`
2. Master Admin → entrer identifiants
3. Créer entreprise avec mode Points OU Tampons
4. Vérifier que ça s'affiche

### Configurer la Fidélité depuis Pro Dashboard
1. Se connecter comme Pro (credentilals reçus par email)
2. Aller à onglet **⚙️ Fidélité**
3. Modifier la configuration
4. Ajouter les clés Apple/Google (optionnel pour tester)
5. Enregistrer

### Envoyer une Notification Push
1. Aller à onglet **📢 Notifications**
2. Cliquer sur "➕ Envoyer une notification"
3. Remplir titre et message
4. Envoyer
5. Voir dans l'historique

---

## 📋 Checklist Avant Go Live

- [ ] Migration appliquée sans erreur
- [ ] Backend redémarré (npm run dev)
- [ ] Au moins une entreprise créée en mode Points
- [ ] Au moins une entreprise créée en mode Tampons
- [ ] Configuration de fidélité testée
- [ ] Notification push testée
- [ ] QR scanner testé avec Points
- [ ] QR scanner testé avec Tampons
- [ ] Clés Apple Wallet obtenues
- [ ] Clés Google Wallet obtenues
- [ ] Clés configurées dans Pro Dashboard

---

## 🐛 Dépannage Rapide

### "Migration échoue au démarrage"
```bash
# Vérifier la connexion DB
mysql -u root -p -e "USE loyalty_saas; SHOW TABLES;"

# Relancer la migration avec logs
node migrate-loyalty.js
```

### "404 Not Found pour les endpoints"
```bash
# Vérifier que le backend est redémarré
# Tuer le processus node et relancer
npm run dev
```

### "Tampons n'apparaissent pas dans la liste des clients"
```bash
# Vérifier dans MySQL
mysql -u root loyalty_saas <<< "SELECT * FROM loyalty_config WHERE loyalty_type='stamps';"
```

### "Les notifications ne s'envoient pas"
```
1. Vérifier que push_notifications_enabled = true
2. Vérifier les logs du backend
3. S'assurer que les clés A pple/Google sont configurées
```

---

## 📱 Endpoints Clés à Tester

```bash
# Test avec curl

# 1. Récupérer config (besoin token pro)
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5000/api/pro/loyalty/config

# 2. Mettre à jour config
curl -X PUT \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"points_per_purchase": 2}' \
     http://localhost:5000/api/pro/loyalty/config

# 3. Envoyer notification
curl -X POST \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"Promo!","message":"20% off!","target_type":"all"}' \
     http://localhost:5000/api/pro/notifications/send

# 4. Stats
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5000/api/pro/loyalty/stats
```

---

## ✨ C'est Prêt!

Une fois ces étapes complétées, votre système de fidélité est **100% opérationnel**!

Contentez-vous de relancer les serveurs et tout devrait fonctionner.
