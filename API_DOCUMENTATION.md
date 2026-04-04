# Documentation Complète API

## 🔐 Authentification

Tous les requests (sauf Public) doivent inclure le header :
```
Authorization: Bearer {token}
```

Le token est un JWT qui expires en 24h.

## 👤 Master Admin Endpoints

### POST /api/admin/login
Connexion du Super Admin

**Request:**
```json
{
  "identifiant": "master_admin",
  "mot_de_passe": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Connecté"
}
```

---

### POST /api/admin/create-company
Créer une nouvelle entreprise

**Auth:** Bearer token (admin)

**Request:**
```json
{
  "nom": "Café du Coin",
  "email": "info@cafeducoin.fr"
}
```

**Response (200):**
```json
{
  "success": true,
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "info@cafeducoin.fr",
  "temporaryPassword": "a9k3m2p1",
  "message": "Entreprise créée avec succès"
}
```

**Erreurs:**
- 400: Nom et email requis
- 400: Email déjà utilisé
- 401: Token manquant ou invalide
- 403: Accès réservé aux administrateurs

---

### PUT /api/admin/suspend-company/:companyId
Suspendre une entreprise

**Auth:** Bearer token (admin)

**Response (200):**
```json
{
  "success": true,
  "message": "Entreprise suspendue"
}
```

---

### PUT /api/admin/reactivate-company/:companyId
Réactiver une entreprise

**Auth:** Bearer token (admin)

**Response (200):**
```json
{
  "success": true,
  "message": "Entreprise réactivée"
}
```

---

### DELETE /api/admin/delete-company/:companyId
Supprimer une entreprise (cascade)

**Auth:** Bearer token (admin)

**Response (200):**
```json
{
  "success": true,
  "message": "Entreprise supprimée (suppression en cascade des clients)"
}
```

---

## 🏪 Pro / Entreprise Endpoints

### POST /api/pro/login
Connexion d'une entreprise

**Request:**
```json
{
  "email": "info@cafeducoin.fr",
  "mot_de_passe": "a9k3m2p1"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "mustChangePassword": true,
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "Café du Coin"
}
```

---

### PUT /api/pro/change-password
Changer le mot de passe (obligatoire 1ère connexion)

**Auth:** Bearer token (pro)

**Request:**
```json
{
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Mot de passe changé"
}
```

**Validation:**
- Minimum 6 caractères
- Match avec le statut must_change_password

---

### GET /api/pro/info
Récupérer les informations de l'entreprise

**Auth:** Bearer token (pro)

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "Café du Coin",
  "email": "info@cafeducoin.fr",
  "recompense_definition": "Un café offert au 10ème passage"
}
```

---

### GET /api/pro/clients
Lister tous les clients de l'entreprise

**Auth:** Bearer token (pro)

**Response (200):**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "nom": "Dupont",
    "prenom": "Jean",
    "telephone": "0612345678",
    "points": 7,
    "type_wallet": "apple"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "nom": "Martin",
    "prenom": "Marie",
    "telephone": "0687654321",
    "points": 10,
    "type_wallet": "google"
  }
]
```

**Isolation:**
- Ne retourne QUE les clients de cette entreprise

---

### POST /api/pro/scan
Scanner le QR code d'un client

**Auth:** Bearer token (pro)

**Request:**
```json
{
  "clientId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200) - Pas de palier:**
```json
{
  "success": true,
  "newPoints": 8,
  "clientName": "Jean Dupont",
  "message": "Point ajouté pour Jean ! (Total: 8)"
}
```

**Response (200) - Palier atteint (10 points):**
```json
{
  "success": true,
  "newPoints": 10,
  "clientName": "Jean Dupont",
  "message": "Point ajouté pour Jean ! (Total: 10)",
  "rewardUnlocked": true,
  "rewardText": "Un café offert au 10ème passage"
}
```

**Logique:**
1. Vérifier que clientId appartient à l'entreprise (isolation)
2. Incrémenter les points (+1)
3. Si nouveaux points % 10 === 0 → rewardUnlocked = true
4. TODO: Appeler APNs / Google Wallet API

---

### PUT /api/pro/adjust-points/:clientId
Ajuster manuellement les points d'un client

**Auth:** Bearer token (pro)

**Request:**
```json
{
  "adjustment": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "newPoints": 5,
  "message": "Points ajustés"
}
```

**Notes:**
- adjustment peut être négatif
- newPoints ne peut jamais être < 0

---

### PUT /api/pro/update-reward
Modifier le texte de la récompense

**Auth:** Bearer token (pro)

**Request:**
```json
{
  "recompense_definition": "Une pâtisserie au choix offerte !"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Récompense mise à jour"
}
```

---

## 🌐 Public Endpoints

### GET /api/companies/:companyId/info
Récupérer les infos d'une entreprise (sans auth)

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nom": "Café du Coin",
  "recompense_definition": "Un café offert au 10ème passage"
}
```

**Note:**
- Retourne UNIQUEMENT si statut = "actif"

---

### POST /api/join/:entrepriseId
Créer un client et générer son pass

**Request:**
```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0612345678",
  "type_wallet": "apple"
}
```

**Response (200) - Apple Wallet:**
- Retourne un buffer binaire (application/vnd.apple.pkpass)
- Le navigateur télécharge / ouvre automatiquement le fichier
- Contient le clientId encodé dans le QR code

**Response (200) - Google Wallet:**
```json
{
  "success": true,
  "clientId": "660e8400-e29b-41d4-a716-446655440003",
  "message": "Client créé. Utilisez cet ID pour créer la carte dans Google Wallet"
}
```

**Erreurs:**
- 400: Champs requis manquants
- 400: Type de wallet invalide
- 404: Entreprise non trouvée ou inactive

**Détails QR Code:**
- Format: `clientId` (UUID)
- Encodage: ISO-8859-1
- Format code: PKBarcodeFormatQR

---

## 📊 Modèles de Données

### Super Admin
```javascript
{
  id: "UUID",
  identifiant: "master_admin",
  mot_de_passe: "bcrypt_hash",
  created_at: "2024-01-01T10:00:00Z"
}
```

### Entreprise
```javascript
{
  id: "UUID",
  nom: "Café du Coin",
  email: "info@cafeducoin.fr",
  mot_de_passe: "bcrypt_hash",
  statut: "actif" | "suspendu",
  recompense_definition: "Un café offert au 10ème passage",
  must_change_password: true | false,
  created_at: "2024-01-01T10:00:00Z"
}
```

### Client
```javascript
{
  id: "UUID",
  entreprise_id: "UUID",
  nom: "Dupont",
  prenom: "Jean",
  telephone: "0612345678",
  points: 7,
  type_wallet: "apple" | "google",
  created_at: "2024-01-01T10:00:00Z"
}
```

---

## 🔒 Sécurité & Bonnes Pratiques

### Hachage des Mots de Passe
- Utilise bcryptjs avec 10 rounds
- Les mots de passe ne sont JAMAIS stockés en clair

### Isolation des Données
```javascript
// Toujours filtrer par entreprise_id
SELECT * FROM clients 
WHERE id = ? AND entreprise_id = req.user.id

// Sinon = FAILLE DE SÉCURITÉ !
SELECT * FROM clients WHERE id = ?  // ❌ DANGEREUX
```

### JWT
- Expiration: 24h
- Payload: { id (entrepriseId), role (admin|pro) }
- Signature: HS256 avec JWT_SECRET

### RBAC (Role-Based Access Control)
- `isAdmin`: Vérifie que role === 'admin'
- `isPro`: Vérifie que role === 'pro'
- Les endpoints sont protégés par ces middlewares

---

## 🧪 Exemples de Tests cURL

### Login Admin
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"identifiant":"master_admin","mot_de_passe":"password123"}'
```

### Créer une Entreprise
```bash
curl -X POST http://localhost:5000/api/admin/create-company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"nom":"Café du Coin","email":"info@cafeducoin.fr"}'
```

### Login Pro
```bash
curl -X POST http://localhost:5000/api/pro/login \
  -H "Content-Type: application/json" \
  -d '{"email":"info@cafeducoin.fr","mot_de_passe":"a9k3m2p1"}'
```

### Scanner Client
```bash
curl -X POST http://localhost:5000/api/pro/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"clientId":"660e8400-e29b-41d4-a716-446655440001"}'
```

### Créer un Client (Public)
```bash
curl -X POST http://localhost:5000/api/join/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"nom":"Dupont","prenom":"Jean","telephone":"0612345678","type_wallet":"apple"}'
```

---

## 📈 Flux Utilisateur Complet

```
1. MASTER ADMIN
   ├── Connexion avec identifiant/mot de passe
   ├── Crée une entreprise (Café du Coin)
   └── Génère mot de passe temporaire pour le pro

2. PRO (Commerçant)
   ├── Connexion avec email + mot de passe temporaire
   ├── Changement obligatoire du mot de passe
   ├── Accès au dashboard
   └── Affiche lien d'invitation pour clients

3. CLIENT (Public)
   ├── Scanne QR code au comptoir
   ├── Remplit formulaire (nom, téléphone, wallet)
   ├── Crée sa carte
   └── La carte s'ajoute à son wallet

4. SCAN & FIDÉLITÉ
   ├── Admin/client scanne la carte de l'autre
   ├── +1 point
   ├── À 10 points → notification de récompense
   └── Boucle continue
```

---

**Dernière mise à jour: 2026**
**Version: 1.0.0**
