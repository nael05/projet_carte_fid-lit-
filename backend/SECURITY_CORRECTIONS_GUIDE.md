# Guide des Corrections de Sécurité et Performance

Ce guide détaille les corrections manelles et automatiques à appliquer au projet.

## ✅ Corrections Automatiques Appliquées

### 1. **Configuration Backend** (FAIT)
- ✅ Ajouté logger Winston (`backend/utils/logger.js`)
- ✅ Ajouté rate limiting (`backend/middlewares/rateLimiter.js`)
- ✅ Ajouté error handler global (`backend/middlewares/errorHandler.js`)
- ✅ Ajouté input validator (`backend/utils/inputValidator.js`)
- ✅ Corrigé CORS avec whitelist dans `server.js`
- ✅ Ajouté helmet pour sécurité headers
- ✅ Ajouté .env.production.example
- ✅ Supprimé route dupliquée `/companies/:companyId/info`
- ✅ Dépendances mises à jour (winston, express-rate-limit, helmet)

### 2. **Nettoyage des Logs** (PARTIELLEMENT FAIT)
- ✅ Middleware auth.js clarifié
- ✅ Plusieurs console.log sensibles → logger
- ⚠️ **À FAIRE MANUELLEMENT**: Finir le `apiController.js` et `loyaltyController.js`

### 3. **Bases de Données** (FICHIERS CRÉÉS)
- ✅ Script d'indexes `migrations/add-database-indexes.sql`
- ✅ Script de sécurité session `migrations/add-session-security.sql`

---

## ⚠️ Actions Manelles Critique - À Faire Immédiatement

### ### 1. **Nettoyer les console.log dans `apiController.js` et `loyaltyController.js`**

Remplacer tous les `console.error(err)` par `logger.error('Function name', { error: err.message })`

```javascript
// AVANT:
} catch (err) {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
}

// APRÈS:
} catch (err) {
  logger.error('Function name error', { error: err.message });
  res.status(500).json({ error: 'Erreur serveur' });
}
```

Fichiers à corriger:
- `backend/controllers/apiController.js` (15 appearances)
- `backend/controllers/loyaltyController.js` (besoin de vérifier)

### 2. **Générer les secrets manquants**

```bash
# Backend - générer JWT SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Créer un .env production sécurisé avec les valeurs réelles
cp backend/.env.production.example backend/.env.production
# Éditer avec les vrais secrets
```

### 3. **Appliquer les migrations de base de données**

```bash
mysql -u user -p database < backend/migrations/add-database-indexes.sql
mysql -u user -p database < backend/migrations/add-session-security.sql
```

### 4. **Implémenter httpOnly Cookies** (RECOMMANDÉ pour production)

L'implémentation actuelle utilise localStorage ce qui est acceptable pour MVP mais pas pour production.

#### Option 1: Rester avec localStorage (MVP court terme)
- ✓ Déjà configuré
- ✗ Vulnérable aux XSS
- Ajouter Content Security Policy (CSP) pour mitiger XSS

#### Option 2: Passer à httpOnly Cookies (Recommandé)
Fichiers à modifier:
- [`backend/middlewares/auth.js`](#middleware-auth) - Envoyer token en httpOnly cookie
- [`frontend/src/api.js`](#frontend-api) - Retirer localStorage, utiliser credentials: 'include'
- Tous les logins dans `apiController.js` - Utiliser res.cookie() au lieu de retourner token

**C'est une change MAJEURE - voir détails ci-dessous**

---

## 📋 Détails des Changements Manelles

### #### 1. Middleware Auth avec httpOnly Cookies

**Fichier**: `backend/middlewares/auth.js`

Ajouter après generateToken:

```javascript
export const sendTokenAsHttpOnlyCookie = (res, token, expiresIn = '24h') => {
  const maxAge = 24 * 60 * 60 * 1000; // 24 heures en ms
  
  res.cookie('authToken', token, {
    httpOnly: true,      // ← JavaScript peut pas accéder
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    sameSite: 'strict',  // Prévient CSRF
    maxAge: maxAge,
    path: '/'
  });
};
```

### 2. Controllers Login - Envoyer Cookie

**Fichiers**: `apiController.js` - proLogin, adminLogin

AVANT:
```javascript
const token = generateToken(company.id, 'pro');
res.json({ token, deviceId, mustChangePassword });
```

APRÈS:
```javascript
const token = generateToken(company.id, 'pro');
sendTokenAsHttpOnlyCookie(res, token);
res.json({ 
  success: true, 
  deviceId, 
  mustChangePassword,
  message: 'Connecté'
  // ← token NOT inclus
});
```

### 3. Frontend - Retirer localStorage

**Fichier**: `frontend/src/api.js`

AVANT:
```javascript
const token = localStorage.getItem('token')
if (token) {
  config.headers.Authorization = `Bearer ${token}`
}
```

APRÈS:
```javascript
// Cookie envoyé automatiquement (httpOnly)
// Pas besoin de faire quoi que ce soit!
```

Ajouter `credentials: 'include'`:
```javascript
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,  // ← Inclure les cookies
})
```

### 4. AuthContext - Nettoyer localStorage

**Fichier**: `frontend/src/context/AuthContext.jsx`

AVANT:
```javascript
const [token, setToken] = useState(localStorage.getItem('token'))

useEffect(() => {
  if (token) localStorage.setItem('token', token)
}, [token])
```

APRÈS:
```javascript
const [user, setUser] = useState(null)
const [loggedIn, setLoggedIn] = useState(false)

// Vérifier login au démarrage
useEffect(() => {
  const checkAuth = async () => {
    try {
      const response = await api.get('/pro/status')
      setUser(response.data)
      setLoggedIn(true)
    } catch {
      setLoggedIn(false)
    }
  }
  checkAuth()
}, [])
```

---

## 🔒 Checklist de Sécurité - Production

```markdown
AVANT DÉPLOIEMENT PRODUCTION:

SÉCURITÉ:
- [ ] Secrets fichiers .env PAS en git (vérifier .gitignore)
- [ ] JWT_SECRET généré forte (64 caractères min)
- [ ] CORS_ORIGINS limité aux domaines approuvés
- [ ] HTTPS/TLS configuré (cert valide)
- [ ] Helmet headers appliquées (voir server.js)
- [ ] Rate limiting actif (tests de brute force)
- [ ] CSRF protection activée (csurf ou similaire)
- [ ] Logs sensibles nettoyés (pas de IDs, passwords, tokens)
- [ ] httpOnly cookies employés (pas localStorage)
- [ ] Content Security Policy configurée

PERFORMANCE:
- [ ] Indexes DB appliquées
- [ ] N+1 queries éliminées (vérifier getClients, handleScan)
- [ ] Pagination impl sur endpoints grands (clients, transactions)
- [ ] Caching mis en place si nécessaire
- [ ] Compression gzip activée

MONITORING:
- [ ] Logs centralisés (Winston écriture fichiers)
- [ ] Alertes erreurs configurées
- [ ] Health checks en place (avec DB)
- [ ] Monitoring DB connectée

DATABASE:
- [ ] Backups configurés (quotidiens)
- [ ] Soft delete envisagé (pas ON DELETE CASCADE)
- [ ] Permissions DB restrictives (readonly user pour certaines tables)
- [ ] Connection pooling optimisé

TESTS:
- [ ] Tests unitaires pour auth, validation
- [ ] Tests intégration logins
- [ ] Penetration testing (XSS, SQL injection, etc.)

API:
- [ ] Documentation Swagger complète
- [ ] Versioning d'API mise en place (v1/)
- [ ] Outdated endpoints deprecated proprement
```

---

## 🚀 Ordre de Déploiement Recommandé

1. Appliquer migrations DB (indexes, security)
2. Nettoyer console.logs (apiController, loyaltyController)
3. Générer secrets production
4. Tester en staging avec HTTPS
5. Optionnel: Passer à httpOnly cookies (change UI aussi)
6. Déployer backend
7. Déployer frontend
8. Tester end-to-end
9. Monitor logs 24h

---

## 📝 Notes Importantes

- **Rate Limiting**: Actuellement disabled en DEV (voir `rateLimiter.js` L15)
- **Logger**: Écrit en console en DEV, logs fichiers en PROD
- **Error Handling**: Stack traces dans logs en DEV, cachées au client en PROD
- **CORS**: Whitelist côté server (meilleur que '*')

---

## ❓ Questions/Problèmes?

- Session management: vérifier `backend/utils/sessionManager.js` pour les expirations
- Validation: `backend/utils/inputValidator.js` pour étendre les règles
- Logging: Voir `backend/utils/logger.js` pour configuration Winston
