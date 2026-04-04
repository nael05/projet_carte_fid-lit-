# 🚨 ACTION REQUISE

## Statut Actuel
- ✅ Backend Node.js: **EN COURS** (port 5000)
- ✅ Frontend React: **EN COURS** (port 3000)
- ❌ MySQL: **NON DÉMARRÉ** ← **ICI LE PROBLÈME**

---

## 🎯 À Faire MAINTENANT

### Étape 1: Démarrer WAMP
```
Recherchez "WampServer" ou "WAMP" dans votre barre des tâches
Lancez-le (cliquez sur l'icône)
Attendez 30-60 secondes que tout soit vert
```

### Étape 2: Importer la base de données
```
1. Ouvrez: http://localhost/phpmyadmin
2. Créez une base "loyalty_saas"
3. Onglet "Importer"
4. Choisissez: schema.sql
5. Cliquez "Go"
```

### Étape 3: Initialiser le Master Admin
```powershell
cd C:\wamp64\www\projet_carte_fid-lit-\backend
node init-admin.js
```

### Étape 4: Accédez à l'application
```
http://localhost:3000/master-admin-secret
```

---

## 🔐 Ce que init-admin.js fera

- ✅ Se connecte à MySQL
- ✅ Crée un super admin automatiquement
- ✅ Affiche les identifiants à utiliser
- ✅ Affiche le mot de passe EN CLAIR une seule fois

---

## 💡 Besoin d'aide?

**WAMP ne démarre pas?**
→ Lisez: INITIALISATION.md

**Erreur "ECONNREFUSED"?**
→ MySQL n'est pas encore démarré
→ Attendez que WAMP affiche "All Green"

**Erreur "No such file or directory"?**
→ Le schema.sql n'a pas été importé
→ Refaites l'étape 2

---

## 📁 Fichiers Utiles

- `backend/test-db.js` - Teste la connexion MySQL
- `backend/init-admin.js` - Crée le master admin
- `backend/.env` - Configuration serveur
- `schema.sql` - Structure de la base de données
- `INITIALISATION.md` - Guide complet

---

**Commencez par l'Étape 1 ci-dessus ⬆️**
