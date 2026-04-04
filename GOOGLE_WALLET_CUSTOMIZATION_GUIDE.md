# 📱 Guide de Personnalisation Google Wallet

## 🎯 Vue d'ensemble

La page "Réglages des entreprises" → "Personnalisation de carte" contient maintenant un onglet spécifique **📱 Google Wallet** qui te permet de customiser TOUS les éléments visibles et techniques de tes cartes Google Wallet.

---

## 📋 Éléments Personnalisables

### 1️⃣ **Class ID Google Wallet** (Identifiant du Modèle)
- **Quoi:** Identifiant unique de ta "classe" de carte dans Google Wallet
- **Format:** Minuscules, chiffres, traits d'union (ex: `FideliteBoulangerie` ou `loyalty_boulangerie`)
- **Impact:** C'est l'ID du "modèle commun" - toutes les cartes créées utiliseront cette même classe
- **Default:** Si vide, utilise `loyalty_points` ou `loyalty_stamps` automatiquement
- **Important:** ⚠️ Changer cet ID crée une nouvelle classe Google Wallet

### 2️⃣ **Titre de la Carte** (Card Title)
- **Quoi:** Le titre principal affiché EN HAUT de la carte
- **Exemple:** "Carte de Fidélité" ou "Mon Enseigne - Rewards"
- **Où ça apparaît:** En haut de la carte dans Google Wallet
- **Default:** `{Nom de l'Enseigne} - Carte de Fidélité`

### 3️⃣ **Texte d'En-tête Principal** (Header Text)
- **Quoi:** Le texte principal central de la carte
- **Exemple:** "Accumulez vos points" ou "Collectionnez des tampons"
- **Où ça apparaît:** Au centre de la carte (place d'honneur)
- **Default:** Basé sur le type de loyauté (Points ou Tampons)
- **Conseil:** Texte court et accrocheur!

### 4️⃣ **Sous-titre / Description** (Subtitle Text)
- **Quoi:** Texte secondaire pour décrire les bénéfices
- **Exemple:** "Profitez des récompenses exclusives" ou "Points gratuits à chaque achat"
- **Où ça apparaît:** Sous le titre de la carte
- **Default:** Auto-généré selon le type de loyauté
- **Conseil:** Incite à l'action!

### 5️⃣ **Template du Code-barres** (Barcode Text Template)
- **Quoi:** Template pour le texte qui apparaît sous/à côté du QR code
- **Placeholder:** Utilise `{clientId}` pour insérer l'ID du client automatiquement
- **Exemple:** 
  - `ID: {clientId}` → Affiche "ID: 550e8400-e29b-41d4-a716-446655440000"
  - `Client {clientId}` → Affiche "Client 550e8400-e29b-41d4-a716-446655440000"
  - `Votre Code: {clientId}` → Affiche "Votre Code: 550e8400..."
- **Default:** `ID: {clientId}`
- **Où ça apparaît:** Sous le QR code de la carte
- **Important:** Essentiel pour le scanner, car il affiche l'ID du client

### 6️⃣ **Description du Pass**
- **Quoi:** Texte détaillé visible dans les "détails du pass" dans Google Wallet
- **Exemple:** "La meilleure boulangerie de Paris - Gagnez 1 point par euro d'achat"
- **Où ça apparaît:** Onglet "Détails" du pass (swiper pour voir)
- **Default:** Vide si non configuré
- **Conseil:** Explique les bénéfices ou comment utiliser la carte

---

## 🎨 Correspondance avec les Autres Onglets

| Onglet | Champs | Affichage Google Wallet |
|--------|--------|-------------------------|
| **Couleurs** | Fond, Texte, Accent | Couleurs de la carte |
| **Template** | Design, Gradient | Arrière-plan de la carte |
| **Texte** | Police | Police du texte sur la carte |
| **Média** | Logo, Image fond | Logo/image sur la carte |
| **Google Wallet** | Title, Header, Barcode, etc. | Textes et labels Google Wallet |

---

## 📝 Exemple Complet - Boulangerie

```
Class ID: FideliteBoulangerie
Card Title: Pâtisserie Laurent - Fidélité
Header Text: 1 Croissant OFFERT tous les 10 achats
Subtitle Text: Fidélité récompensée - Nouveaux clients bienvenue!
Barcode Text Template: Numéro Client: {clientId}
Description: Pâtisserie Laurent depuis 1985. Profitez de nos réductions exclusives. 1 point par euro dépensé!
```

**Résultat sur la carte Google Wallet:**
```
┌─────────────────────────────────┐
│ Pâtisserie Laurent - Fidélité  │  ← Card Title
├─────────────────────────────────┤
│ [Logo/Image Background]         │
│                                 │
│ 1 Croissant OFFERT tous les    │  ← Header Text
│ 10 achats                       │
│                                 │
│         [QR CODE]               │  ← Main barcode
│   Numéro Client: 550e8400...   │  ← Barcode Text
│                                 │
│ Fidélité récompensée -          │  ← Subtitle Text
│ Nouveaux clients bienvenue!     │
└─────────────────────────────────┘
```

---

## ⚡ Flux Technique

```
1. ProDashboard 
   └─ Charges la config Google Wallet

2. CardCustomizer - Onglet "Google Wallet"
   └─ Tu personnalises les 6 champs
       └─ Save → API PUT /pro/card-customization

3. Backend
   └─ Stocke dans card_customization table
       └─ Colonnes: wallet_class_id, wallet_card_title, etc.

4. Quand le client crée sa carte (JoinWallet)
   └─ RegisterClientAndGeneratePass()
       └─ Récupère la config customization
           └─ Passe à googleWalletManager.createWalletPass()
               └─ Injecte les valeurs personnalisées
                   └─ Crée le pass Google Wallet unique

5. Le client reçoit le pass Google Wallet
   └─ Avec TOUS tes paramètres appliqués ✅
```

---

## 🚀 Bonnes Pratiques

### ✅ À Faire:
- ✅ Personnalise les 6 champs pour chaque type de loyauté (points/tampons)
- ✅ Utilise `{clientId}` dans le template du code-barres
- ✅ Garde les textes courts et impactants
- ✅ Teste la création d'une nouvelle carte pour vérifier

### ❌ À Éviter:
- ❌ Ne pas changer le Class ID après avoir créé des cartes (elles se désynchronisent)
- ❌ Textes trop longs (ils s'affichent mal sur les petits écrans)
- ❌ Caractères spéciaux dans le Class ID
- ❌ Oublier `{clientId}` si tu veux montrer l'ID du client

---

## 🔄 DIFFÉRENT pour Points vs Tampons

Si tu as configuré:
- **Loyauté = Points:**
  - Onglet Google Wallet configure uniquement la version "Points"
  - New customers verront "Accumulez vos points"
  
- **Loyauté = Tampons:**
  - Configuration séparée pour les "Tampons"
  - New customers verront "Collectionnez des tampons"

✅ Chaque type de loyauté a sa propre configuration!

---

## 🧪 Comment Tester

1. Va sur **Réglages de l'entreprise** → **Personnalisation de carte**
2. Clique sur l'onglet **📱 Google Wallet**
3. Personnalise les 6 champs
4. Clique **💾 Sauvegarder**
5. Va sur **Rejoindre le Wallet** (page cliente)
6. Remplis le formulaire JoinWallet
7. Choisis **🔴 Google Wallet**
8. Clique **Créer et Ajouter ma carte**
9. → **Google Wallet s'ouvre automatiquement** avec TA personnalisation! ✅

---

## 📱 Affichage Real-Time dans Google Wallet

**AVANT (default):**
```
Generic Loyalty Card - Loyalty
Accumulate loyalty points
[QR CODE]
Client ID: uuid...
```

**APRÈS (avec ta personnalisation):**
```
Pâtisserie Laurent - Fidélité
1 Croissant OFFERT tous les 10 achats
[QR CODE]
Numéro Client: uuid...
Fidélité récompensée - Nouveaux clients bienvenue!
```

---

## 💡 Cas d'Usage Avancé

### **Profiter de la séparation Points/Tampons:**

**TAB 1 - Pour Points:**
```
Class ID: loyalty_points_boulangerie
Card Title: Boulangerie Points
Header Text: 1 Point = 1€ dépensé
Barcode Template: Points ID: {clientId}
```

**TAB 2 - Pour Tampons:**
```
Class ID: loyalty_stamps_boulangerie
Card Title: Boulangerie Tampons
Header Text: 1 Tampon = 10€ d'achat
Barcode Template: Stamps ID: {clientId}
```

→ Les deux cartes auront un **design complètement différent** dans Google Wallet! 🎨

---

## 🆘 Dépannage

**Q: J'ai changé le Class ID, mais les cartes ne se mettent pas à jour**
A: C'est normal. Les anciennes cartes gardent l'ancien Class ID. Seules les NOUVELLES cartes créées après auront le nouveau.

**Q: Le template `{clientId}` ne fonctionne pas**
A: Assure-toi que c'est Well écrit: `{clientId}` exactement, pas `{ClientId}` ou `{client_id}`

**Q: Rien n'a changé quand j'ai personnalisé**
A: Clique bien sur **💾 Sauvegarder** vert en bas à gauche!

---

**Prêt à épater tes clients avec des cartes ultra-personnalisées? 🚀**
