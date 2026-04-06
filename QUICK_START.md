# ⚡ QUICK START - Actions Immédiate

## 1️⃣ Installer les dépendances ✅ (DÉJÀ FAIT)
```bash
cd backend
npm install
```

## 2️⃣ Nettoyer les console.logs (30 min)

### Option A: Automatique PowerShell ⭐ (Recommandé)
```powershell
cd ..\backend
ps1 .\clean-console-logs.ps1
```

### Option B: Manuel VS Code
Ouvrir Ctrl+H (Find/Replace) pour chaque fichier:
- `controllers/apiController.js`
- `controllers/loyaltyController.js`

Remplacer:
```
Find: console\.error\(err\);
Replace: logger.error("ERROR", { error: err.message });

Find: console\.log\(
Replace: logger.info(
```

## 3️⃣ Générer secrets sécurisés (10 min)

```bash
# Générer JWT SECRET (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copier la sortie

# Ouvrir backend/.env.production
# Remplisser:
JWT_SECRET=<paste ici>
ALLOWED_ORIGINS=https://myapp.com,https://www.myapp.com
DB_HOST=prod-server
DB_USER=prod_user
DB_PASSWORD=<secure password>
```

## 4️⃣ Appliquer migrations DB (10 min)

```bash
# Terminal MySQL/MariaDB
mysql -u root -p

# Si demandé entrer password
USE loyalty_db;

# Ajouter indexes (IMPORTANT pour performance)
SOURCE backend/migrations/add-database-indexes.sql;

# Ajouter tables security
SOURCE backend/migrations/add-session-security.sql;

# Vérifier
SHOW INDEXES FROM clients;
# Doit avoir: idx_clients_entreprise_id, idx_clients_created_at, etc.
```

## 5️⃣ Tester le serveur (5 min)

```bash
cd backend
npm run dev

# Dans autre terminal
curl http://localhost:5000/health
# Doit retourner: { "status": "OK", "database": "connected" }
```

## 6️⃣ Implémenter httpOnly Cookies (2-3 heures - OPTIONNEL mais RECOMMANDÉ)

Voir: `backend/SECURITY_CORRECTIONS_GUIDE.md` section "Implémenter httpOnly Cookies"

Fichiers à modifier:
```bash
1. backend/middlewares/auth.js
   - Ajouter: sendTokenAsHttpOnlyCookie() function

2. backend/controllers/apiController.js
   - proLogin() : res.json({ success, ... }) sans token
   - adminLogin() : idem

3. frontend/src/api.js
   - Ajouter: withCredentials: true

4. frontend/src/context/AuthContext.jsx
   - Retirer: localStorage.getItem('token')
   - Utiliser: API call pour vérifier l'auth
```

## 7️⃣ Vérifier la sécurité (15 min)

```bash
# Vérifier CORS fonctionnel
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -v http://localhost:5000/api/pro/login
# Doit avoir: Access-Control-Allow-Origin header

# Tester rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/pro/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test","mot_de_passe":"test"}'
done
# Après 5: "Trop de tentatives..."

# Vérifier logs
ls -la logs/
# Doit avoir: error.log, combined.log (production only)
```

## 8️⃣ Avant le déploiement (Checklist)

```markdown
SÉCURITÉ:
☐ console.logs sensibles nettoyés
☐ .env.production complet (pas en git)
☐ Secrets générés et sécurisés
☐ CORS limité aux domaines autorisés
☐ HTTPS/TLS certificat valide
☐ Rate limiting testé ✓

DATABASE:
☐ Indexes appliquées
☐ Backups configurés
☐ Connection pooling optimisé

LOGS/MONITORING:
☐ Winston logs créés
☐ Health check fonctionnel
☐ Monitoring connecté (optionnel)

TESTS:
☐ Login fonctionne
☐ Rate limit fonctionne
☐ Errors gérées proprement

FRONTEND:
☐ CORS credentials: 'include'
☐ localStorage nettoyé ou httpOnly cookies
```

---

## 📚 Documentation Complète

- **Sécurité**: `backend/SECURITY_CORRECTIONS_GUIDE.md`
- **Résumé**: `CORRECTIONS_SUMMARY.md`
- **Bugs**: `backend/BUG_FIXES_AND_IMPROVEMENTS.js`

---

## 🆘 Problèmes Courant

### "npm: command not found"
```bash
# Installer Node.js depuis nodejs.org
# ou sur Windows: choco install nodejs
```

### "MySQL connection failed"
```bash
# Vérifier service MySQL/MariaDB
# Windows: net start MySQL
# Linux: sudo systemctl start mysql
```

### "File already in use" lors du cleanup
```bash
# Fermer le fichier dans VS Code
# Puis réexécuter le script
```

### "Logger is not defined"
```bash
# Assurer que l'import est présent:
import logger from '../utils/logger.js';
```

---

## ✅ Ressources

- [Winston Logger Docs](https://github.com/winstonjs/winston)
- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [Helmet Security Headers](https://helmetjs.github.io/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Temps total: ~1 heure pour les corrections immédiates**  
**Temps total avec httpOnly cookies: ~3-4 heures**
