# Guide de Démarrage Rapide

## ⏱️ Démarrage en 5 minutes

### 1. Base de Données
```bash
mysql -u root -p < schema.sql
```

### 2. Terminal 1 : Backend
```bash
cd backend
npm install
npm run dev
```
→ Démarre sur http://localhost:5000

### 3. Terminal 2 : Frontend
```bash
cd frontend
npm install
npm run dev
```
→ Démarre sur http://localhost:3000

## 🔑 Identifiants de Test

### Master Admin
```
URL: http://localhost:3000/master-admin-secret
Identifiant: master_admin
Mot de passe: À générer (voir schema.sql)
```

### Exemple de Création d'Entrprise
1. Se connecter à `/master-admin-secret`
2. Remplir : Nom = "Café du Coin", Email = "cafe@example.com"
3. Le système génère un mot de passe temporaire
4. L'utilisateur Pro se connecte sur `/pro/login` avec cet email

## 📱 Workflow Client

1. **Client scanne QR** au comptoir → `/join/:entrepriseId`
2. **Client crée sa carte** → Téléchargement/ajout au wallet
3. **Commerçant scanne** la carte du client → +1 point
4. **À 10 points** → Récompense débloquée

## 📊 Structure Données

- **super_admins** : Propriétaire du SaaS (1)
- **entreprises** : Commerçants (N)
- **clients** : Clients de chaque commerçant (N)

## 🔐 Logique de Sécurité

Chaque request Pro inclut le JWT qui contient l'ID de l'entreprise.
L'API vérifie TOUJOURS que les données appartiennent à cette entreprise.

```javascript
// Exemple isolation données
SELECT * FROM clients 
WHERE id = ? AND entreprise_id = req.user.id
```

## 🎯 Points Clés à Retenir

- ✅ Chaque entreprise voit UNIQUEMENT ses clients
- ✅ QR code = UUID du client
- ✅ Palier de récompense = 10 points
- ✅ À première connexion, changement de password obligatoire

## ⚠️ Erreurs Courantes

### MySQL "Connection refused"
→ `sudo service mysql start` ou XAMPP/WAMP

### "VITE_API_URL not defined"
→ Éditer `frontend/.env`

### Token invalide
→ Éditer `backend/.env` et `JWT_SECRET`

---

**Prêt à développer ?** 🚀
