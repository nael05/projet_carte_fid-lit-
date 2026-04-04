# 🚀 INITIALISATION COMPLÈTE DU PROJET

## ❌ Problème: MySQL n'est pas démarré

MySQL n'est pas en cours d'exécution. Vous utilisez WAMP, donc suivez ces étapes:

---

## ✅ ÉTAPE 1: Démarrer WAMP

1. **Cherchez l'icône WAMP** 
   - Cherchez "wamp" dans votre barre de tâches (coin inférieur droit)
   - Ou lancez "WampServer" depuis le menu Démarrer

2. **Attendez que WAMP démarre**
   - L'icône doit passer au **vert** (pas orange)
   - Cela peut prendre 10-30 secondes

3. **Vérifiez que MySQL est vert**
   - Cliquez sur l'icône WAMP
   - Cherchez "MySQL" et vérifiez qu'il est "▶ GREEN"

---

## ✅ ÉTAPE 2: Créer la base de données

1. **Aller sur phpMyAdmin**
   - Ouvrez: http://localhost/phpmyadmin
   - Connectez-vous (username: root, password: vide)

2. **Créer la base "loyalty_saas"**
   - Cliquez sur "Nouvelle base de données"
   - Nom: `loyalty_saas`
   - Cliquez "Créer"

3. **Importer le schéma**
   - Cliquez sur la base "loyalty_saas" (colonne de gauche)
   - Allez à l'onglet "Importer"
   - Choisissez le fichier: `schema.sql`
   - Cliquez "Go" (en bas du formulaire)

---

## ✅ ÉTAPE 3: Initialiser le Master Admin

Une fois MySQL démarré et la base créée, lancez dans PowerShell:

```powershell
cd C:\wamp64\www\projet_carte_fid-lit-\backend
node init-admin.js
```

Cela créera automatiquement:
- ✅ Super admin avec identifiant: `master_admin`
- ✅ Mot de passe sécurisé
- ✅ Tous les identifiants à utiliser

---

## 🎯 Après initialisation

1. Allez sur: **http://localhost:3000/master-admin-secret**
2. Connectez-vous avec les identifiants affichés
3. Créez votre première entreprise

---

## ❓ Besoin d'aide?

- **WAMP ne démarre pas?**
  - Essayez de redémarrer votre ordinateur
  - Vérifiez que le port 3306 n'est pas utilisé

- **phpMyAdmin ne fonctionne pas?**
  - Vérifiez que WAMP est bien lancé
  - Essayez: http://localhost/wamp (tableau de bord WAMP)

- **Erreur "access denied"?**
  - Renseignez votre password MySQL dans `backend/.env` (DB_PASSWORD)

---

**✨ Vous êtes prêt à commencer!**
