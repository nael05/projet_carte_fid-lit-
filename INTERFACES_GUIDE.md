# 🎟️ LES 3 INTERFACES DU SYSTÈME

Accès rapide à toutes les interfaces de votre SaaS:

---

## 📊 INTERFACE 1: Master Admin (Super Admin)

**URL:** http://localhost:3000/master-admin-secret

### Identifiants
```
Identifiant: master_admin
Mot de passe: AdminPassword123!
```

### Fonctionnalités
✅ **Créer une entreprise**
- Formulaire: Nom + Email
- Le système génère un mot de passe temporaire aléatoire
- Les identifiants sont affichés pour donner au commerçant

✅ **Gérer les entreprises**
- 🔴 Suspendre (bloquer l'accès)
- 🟢 Réactiver
- 🗑️ Supprimer (suppression en cascade des clients)

✅ **Vue d'administration**
- Interface minimaliste et sécurisée
- Connexion par identifiant + mot de passe

### Cas d'usage
```
Master Admin (Vous)
    ↓
Crée "Café du Coin" avec email: cafe@example.com
    ↓
Génère password: a9k3m2p1
    ↓
Donne ces identifiants au propriétaire du café
    ↓
Le propriétaire se connecte sur /pro/login
```

---

## 🏪 INTERFACE 2: Pro / Commerçant Dashboard

**URL:** http://localhost:3000/pro/login

### Identifiants (créés par Master Admin)
```
Email: cafe@example.com (créé via Master Admin)
Mot de passe: (temporaire, à changer à la 1ère connexion)
```

### Fonctionnalités

#### 📱 Onglet 1: Scanner QR (Principal)
```
🎯 Action: Scanner le QR code du client
- La caméra se lance automatiquement
- Positionnez le QR code face à la caméra
- À chaque scan → +1 point
- Alerte visuelle: "Point ajouté pour [Nom] !"
- À 10 points → Grosse notification "🎉 Récompense débloquée !"
```

#### 👥 Onglet 2: Base Clients
```
🎯 Tableau de tous les clients
Colonnes:
- Nom + Prénom
- Numéro de téléphone
- Points actuels
- Type de wallet (🍎 Apple ou 🔴 Google)

Actions:
- Bouton +1: Ajouter 1 point
- Bouton -1: Retirer 1 point
- Modification instantanée en base
```

#### ⚙️ Onglet 3: Configuration
```
🎯 Modifier la récompense
- Texte initial: "Une surprise vous attend !"
- Éditable: "Un café offert au 10ème passage"
- Ce texte s'affiche au client quand palier atteint
```

### Flux Complet
```
1. Commerçant se connecte
2. Flag "must_change_password = TRUE" → Redirection /pro/reset-password
3. Change son mot de passe temporaire
4. Accès au dashboard
5. Scanner les clients ou gérer manuellement
```

---

## 📱 INTERFACE 3: Inscription Client (Public)

**URL:** http://localhost:3000/join/:entrepriseId

### Accès
```
Client scanne le QR code sur le comptoir du magasin
    ↓
QR code → /join/{ID_ENTREPRISE}
    ↓
Page d'inscription s'ouvre automatiquement
```

### Fonctionnalités

#### 📝 Formulaire
```
Nom
Prénom
Numéro de téléphone
Sélecteur: Apple Wallet ou Google Wallet
```

#### 🎁 Bouton "Créer et Ajouter ma Carte"
```
Processing:
1. Backend crée le client en base (UUID unique)
2. UUID = clientId encodé dans le QR code
3. Génère le fichier .pkpass (Apple) ou JSON (Google)
4. Télécharge/ouvre le fichier automatiquement
```

#### 🍎 Apple Wallet
```
- Fichier .pkpass téléchargé
- Client clique "Ajouter"
- Carte ajoutée au wallet natif
- Points visibles directement dans le wallet
```

#### 🔴 Google Wallet
```
- Lien de création Google Wallet API
- Client crée sa carte via Google
- Points synchronisés en temps réel
```

### Points Affichés
```
⚠️ IMPORTANT: Les points NE s'affichent QUE dans le wallet natif
Pas de page web pour voir les points
Le commerçant scanne la carte pour ajouter les points
L'app wallet met à jour les points
```

---

## 🔐 Flux Complet de Fidélité

```
┌─────────────────────────────────────────────────────────┐
│ MASTER ADMIN                                             │
│ http://localhost:3000/master-admin-secret               │
│ Login: master_admin / AdminPassword123!                 │
│                                                         │
│ → Crée "Café du Coin"                                   │
│ → Génère password temporaire                            │
│ → Donne identifiants au commerçant                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ PRO / COMMERÇANT                                         │
│ http://localhost:3000/pro/login                          │
│ Login: cafe@example.com / password_temporaire            │
│                                                         │
│ → Affiche le QR code d'inscription aux clients          │
│ → Scanne les clients → +1 point                         │
│ → Gère les points manuellement                          │
│ → Configure la récompense                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ CLIENT PUBLIC                                            │
│ http://localhost:3000/join/{ID_ENTREPRISE}              │
│                                                         │
│ → Scanne QR au comptoir                                │
│ → Remplit formulaire (Nom, Prénom, Tel)               │
│ → Crée sa carte                                        │
│ → Ajoute au Apple Wallet ou Google Wallet              │
│ → Acumule les points                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 DÉMO RAPIDE (5 min)

### Step 1: Master Admin crée une entreprise
```
1. Allez sur: http://localhost:3000/master-admin-secret
2. Login: master_admin / AdminPassword123!
3. Remplissez:
   - Nom: "Café Test"
   - Email: "cafe@test.com"
4. Cliquez "Créer"
5. ⬇️ Récupérez le password temporaire affiché
```

### Step 2: Pro se connecte
```
1. Allez sur: http://localhost:3000/pro/login
2. Email: cafe@test.com
3. Password: (celui généré ci-dessus)
4. Changez votre mot de passe
5. Accédez au dashboard
```

### Step 3: Client crée sa carte
```
1. Obtenez l'ID entreprise créée (UUID)
2. Allez sur: http://localhost:3000/join/{COMPANY_ID}
3. Remplissez le formulaire
4. Choisissez Apple ou Google Wallet
5. Cliquez "Créer et Ajouter ma Carte"
```

### Step 4: Pro scanne et ajoute des points
```
1. Sur dashboard pro, onglet "Scanner QR"
2. Lancez la caméra
3. Positionnez le QR code du client
4. Scan → +1 point ✓
5. À 10 points → Notification récompense
```

---

## 🔑 Identifiants de Test

### Master Admin (toujours identique)
```
Identifiant: master_admin
Mot de passe: AdminPassword123!
```

### Pro (créés par Master Admin)
```
Exemple 1:
  Email: cafe@test.com
  Password temporaire: a9k3m2p1 (changé à 1ère connexion)

Exemple 2:
  Email: boulangerie@test.com
  Password temporaire: k7b2m1x9 (changé à 1ère connexion)
```

### Client (pas de login)
```
Pas d'authentification
Accès direct via QR code/lien
UUID unique généré pour chaque client
```

---

## 🛠️ Réinitialiser le Master Admin

Si vous oubliez le mot de passe:

```bash
cd C:\wamp64\www\projet_carte_fid-lit-\backend
node reset-admin.js
```

Cela:
- ✅ Supprime l'ancien master admin
- ✅ En crée un nouveau
- ✅ Affiche les identifiants

---

## 📚 Autres Ressources

- **API_DOCUMENTATION.md** - Tous les endpoints détaillés
- **BACKEND_ARCHITECTURE.md** - Architecture technique
- **FRONTEND_ARCHITECTURE.md** - Structure React
- **DATABASE_SETUP.md** - Configuration MySQL

---

**Prêt à tester ?** Commencez par http://localhost:3000 🚀
