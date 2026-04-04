# Guide d'Initialisation de la Base de Données

## 🚀 Étapes

### 1. Importer le schéma

```bash
mysql -u root -p < schema.sql
```

Cela crée :
- Base de données `loyalty_saas`
- Tables `super_admins`, `entreprises`, `clients`

### 2. Créer le première Master Admin

Pour créer un master admin avec un mot de passe sécurisé :

**Option A : Via Node.js (recommandé)**
```bash
cd backend
node -e "
const bcryptjs = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const password = process.env.MASTER_PASSWORD || 'AdminPassword123!';
const hash = bcryptjs.hashSync(password, 10);
const id = uuidv4();

console.log('INSERT INTO super_admins (id, identifiant, mot_de_passe) VALUES ');
console.log(\`('\${id}', 'master_admin', '\${hash}');\`);
console.log('');
console.log('Master Admin créé avec :');
console.log('- Identifiant: master_admin');
console.log(\`- Mot de passe: \${password}\`);
console.log(\`- Hash: \${hash}\`);
"
```

**Option B : Manuellement via MySQL**

1. Générer un hash bcrypt en ligne (bcrypt.online)
2. Exécuter :
```sql
INSERT INTO super_admins (id, identifiant, mot_de_passe) 
VALUES (UUID(), 'master_admin', '$2b$10$...');
```

### 3. Vérifier l'insertion

```bash
mysql -u root -p loyalty_saas -e "SELECT * FROM super_admins;"
```

## 📝 Exemple : Créer Master Admin avec Mot de Passe

```bash
# Terminal
cd backend

# Créer le master admin avec mot de passe "AdminPassword123!"
mysql -u root -p loyalty_saas << EOF
INSERT INTO super_admins (id, identifiant, mot_de_passe) 
VALUES (
  UUID(), 
  'master_admin', 
  '\$2b\$10\$YOUR_BCRYPT_HASH_HERE'
);
EOF
```

**Pour générer le hash :**
```bash
node -e "
const bcrypt = require('bcryptjs');
const pwd = 'AdminPassword123!';
const hash = bcrypt.hashSync(pwd, 10);
console.log('Hash:', hash);
"
```

## 🔐 Flux de Création de Compte

### Master Admin (manuel)
1. Insertion directe dans super_admins (via MySQL ou script)
2. ID = UUID
3. Mot de passe = bcrypt hash
4. Accès immediate à `/master-admin-secret`

### Pro / Entreprise (via Master Admin)
1. Master Admin crée l'entreprise via l'interface
2. Système génère UUID pour company_id
3. Système génère mot de passe temporaire aléatoire
4. Mot de passe est haché + stocké en base
5. Flag `must_change_password = TRUE`
6. Master Admin reçoit les identifiants pour donner au pro

### Client (via formulaire public)
1. Client scanne QR code → `/join/:entrepriseId`
2. Remplit formulaire (nom, prénom, téléphone, type wallet)
3. Système crée enregistrement clients en base avec :
   - `id = UUID` (ce UUID est encodé dans le QR code)
   - `points = 0`
   - `type_wallet` = apple ou google
4. Génère le pass (.pkpass ou Google Wallet)
5. Retour du fichier au navigateur

## 📊 État Initial de la Base

Après import du schema.sql, l'état est :

```
super_admins:    VIDE (À remplir)
entreprises:     VIDE
clients:         VIDE
```

## 🔄 Cycle Complet de Test

```bash
# 1. Importer schéma
mysql -u root -p < schema.sql

# 2. Créer Master Admin
mysql -u root -p loyalty_saas << EOF
INSERT INTO super_admins (id, identifiant, mot_de_passe) 
VALUES (UUID(), 'master_admin', '$2b$10$...');
EOF

# 3. Démarrer backend + frontend
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev  # Terminal 2

# 4. Aller sur /master-admin-secret et se connecter

# 5. Créer une entreprise (ex: "Café du Coin")

# 6. Aller sur /pro/login et se connecter avec les identifiants fournis

# 7. Remplir formulaire changement password

# 8. Accéder au dashboard pro

# 9. Créer un client via /join/:entrepriseId

# 10. Scanner le QR code
```

## ⚠️ Erreurs Courantes

### "Access denied for user 'root'@'localhost'"
→ Vérifier mot de passe MySQL dans .env

### "Unknown database 'loyalty_saas'"
→ Ont pas importé le schema.sql correctement
→ Retenter : `mysql -u root -p < schema.sql`

### "Duplicate entry" dans super_admins
→ Master admin déjà inséré
→ Vérifier avant de réinsérer

### "Invalid credentials" dans l'interface
→ Vérifier que le hash bcrypt est correct
→ Utiliser `bcryptjs.hashSync()` pour être sûr

## 🛠️ Script Python de Configuration

```python
import bcryptjs
import uuid
import mysql.connector

# Configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'loyalty_saas'
}

# Créer la connexion
conn = mysql.connector.connect(**db_config)
cursor = conn.cursor()

# Master Admin
admin_id = str(uuid.uuid4())
admin_password_plain = 'AdminPassword123!'
admin_password_hash = bcryptjs.hashpw(
    admin_password_plain.encode(), 
    bcryptjs.gensalt(10)
).decode()

sql = "INSERT INTO super_admins (id, identifiant, mot_de_passe) VALUES (%s, %s, %s)"
cursor.execute(sql, (admin_id, 'master_admin', admin_password_hash))

conn.commit()
cursor.close()
conn.close()

print(f"Master Admin créé !")
print(f"ID: {admin_id}")
print(f"Identifiant: master_admin")
print(f"Password: {admin_password_plain}")
print(f"Hash: {admin_password_hash}")
```

## 📱 Test Rapide après Init

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Test la connexion
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"identifiant":"master_admin","mot_de_passe":"AdminPassword123!"}'

# Si OK → retour d'un token JWT
```

---

**Prêt à initialiser ?** 🚀
