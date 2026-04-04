# 🎨 Guide de Personnalisation des Cartes de Fidélité

## Overview
Les entreprises peuvent maintenant personnaliser entièrement l'apparence des cartes de fidélité de leurs clients. Ces modifications s'appliquent en temps réel à toutes les cartes existantes sans supprimer les données ou les points accumulés.

## ✨ Fonctionnalités

### 1. Personnalisation des Couleurs
- **Couleur de fond principal** - Couleur de base de la carte
- **Couleur du texte** - Texte lisible sur la carte
- **Couleur d'accent** - Pour les badges et les éléments importants
- **Rayon des coins** - Entre 0px (carrée) et 30px (très arrondie)

### 2. Templates de Design
- **Classique** - Design simple et efficace
- **Gradient** - Dégradé de couleurs personnalisé
- **Minimaliste** - Design très sobre et moderne
- **Premium** - Design luxe avec éléments décoratifs

### 3. Motifs
- **Couleur unie** - Arrière-plan uni
- **Points** - Motif de points discrets
- **Lignes** - Motif de lignes diagonales
- **Grille** - Motif en grille

### 4. Police d'Écriture
Choix parmi 6 polices professionnelles:
- Arial
- Helvetica
- Times New Roman
- Courier
- Georgia
- Trebuchet MS

### 5. Média
- **Logo/Image d'en-tête** - Votre logo en haut de la carte
- **Image de fond** - Arrière-plan personnalisé

### 6. Texte Personnalisé
- **Afficher le nom de l'entreprise** - Actif/Inactif
- **Afficher le type de fidélité** - (Points/Tampons)
- **Message personnalisé** - Jusqu'à 100 caractères (ex: "Merci de votre fidélité!")

## 📋 Accès à la Personnalisation

### Pour les Entreprises (Pro Dashboard)
1. Connectez-vous à votre tableau de bord pro
2. Allez à l'onglet **"🎨 Design Carte"**
3. Utilisez les contrôles pour personnaliser:
   - Cliquez sur les onglets: Couleurs, Template, Texte, Média
   - Voyez l'aperçu en direct à droite
   - Cliquez **"💾 Sauvegarder"** quand vous êtes satisfait

### Pour les Clients (JoinWallet)
Lors de la création d'une nouvelle carte, les clients voient un aperçu de la carte personnalisée avant de la valider.

## 🗄️ Base de Données

### Table: `card_customization`
```sql
CREATE TABLE card_customization (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL UNIQUE,
  card_background_color VARCHAR(7),          -- Format: #RRGGBB
  card_text_color VARCHAR(7),
  card_accent_color VARCHAR(7),
  card_border_radius INT,                     -- 0-30
  card_logo_url TEXT,                         -- Data URL ou URL externe
  card_pattern VARCHAR(50),                   -- solid, dots, lines, grid
  font_family VARCHAR(100),
  show_company_name BOOLEAN,
  show_loyalty_type BOOLEAN,
  custom_message TEXT,                        -- Max 100 caractères
  card_design_template VARCHAR(50),           -- classic, gradient, minimal, premium
  gradient_start VARCHAR(7),                  -- Pour template gradient
  gradient_end VARCHAR(7),
  background_image_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Colonne dans la table clients:
ALTER TABLE cards ADD COLUMN card_style_version INT DEFAULT 1;
```

## 🔌 API Endpoints

### GET `/pro/card-customization/:empresaId`
Récupère les paramètres de personnalisation d'une entreprise.

**Réponse:**
```json
{
  "id": 1,
  "company_id": 5,
  "card_background_color": "#1f2937",
  "card_text_color": "#ffffff",
  "card_accent_color": "#3b82f6",
  "card_border_radius": 12,
  "card_logo_url": "data:image/...",
  "card_pattern": "solid",
  "font_family": "Arial",
  "show_company_name": true,
  "show_loyalty_type": true,
  "custom_message": "Merci de votre fidélité!",
  "card_design_template": "classic",
  "gradient_start": null,
  "gradient_end": null,
  "background_image_url": null
}
```

### PUT `/pro/card-customization/:empresaId`
Met à jour les paramètres de personnalisation.

**Body:**
```json
{
  "card_background_color": "#1f2937",
  "card_text_color": "#ffffff",
  "card_accent_color": "#3b82f6",
  "card_border_radius": 12,
  "card_logo_url": "data:image/...",
  "card_pattern": "solid",
  "font_family": "Arial",
  "show_company_name": true,
  "show_loyalty_type": true,
  "custom_message": "Merci de votre fidélité!",
  "card_design_template": "classic",
  "gradient_start": "#3b82f6",
  "gradient_end": "#1f2937",
  "background_image_url": "data:image/..."
}
```

## 🧩 Composants React

### CardCustomizer.jsx
Interface complète de personnalisation avec aperçu en direct.
- Tabs pour les différentes sections
- Pickers de couleurs
- Upload de fichiers
- Sauvegarde automatique avec feedback

### CustomerCard.jsx
Affichage d'une carte de fidélité personnalisée.
- Applique tous les paramètres de personalisation
- Responsive et animé
- Utilisé pour l'aperçu et l'affichage final

### Intégration dans ProDashboard
- Nouvel onglet "🎨 Design Carte"
- Modal pour voir les cartes des clients
- Botton 🎫 dans la liste des clients

## 💾 Migration de la BD

Avant d'utiliser cette fonctionnalité, exécutez la migration:

```bash
cd backend
mysql -u root -p card_loyalty < migrations/migration-card-customization.sql
```

## 🎯 Cas d'Usage

### Restaurant
- Logo en haut
- Couleur principale = couleur de la marque
- Message: "Accumulez 1 point par €10 dépensé!"
- Template Premium pour un look luxe

### Boutique
- Gradient avec les couleurs de la marque
- Afficher les tampons de manière attractive
- Logo du magasin

### Service
- Minimaliste pour un look professionnel
- Couleurs corporatives
- Message: "Restez connecté avec nous"

## 📱 Affichage sur les Wallets

Les paramètres de personnalisation s'appliquent à:
- ✅ L'aperçu lors de la création de compte
- ✅ La carte dans Apple Wallet (texte et badge)
- ✅ La carte dans Google Wallet
- ✅ L'affichage dans le dashboard

**Note:** Les logos et images de fond utilisent des Data URLs encodées en base64 pour compatibilité maximale avec les wallets.

## ⚠️ Limitations

1. **Taille des images:** Max 500KB en base64
2. **Police d'écriture:** Compatible avec tous les systèmes d'exploitation
3. **Wallet Apple:** Certains éléments peuvent être ignorés ou modifiés
4. **Wallet Google:** Respect des normes Google Wallet

## 🔄 Mise à Jour en Temps Réel

Quand une entreprise change la personnalisation:
1. Les paramètres sont mis à jour dans `card_customization`
2. Les cartes existantes sont **automatiquement mises à jour**
3. Les points et données ne sont **jamais supprimés**
4. `card_style_version` peut être incrémenté pour tracker les versions

## 🐛 Troubleshooting

### Les images ne s'affichent pas
- Vérifiez que le fichier n'est pas trop lourd
- Les Data URLs doivent être en base64
- Testez dans un autre navigateur

### Les couleurs ne correspondent pas
- Vérifiez le format hex: #RRGGBB
- Testez le contraste texte/fond pour la lisibilité

### Le logo est pixelisé
- Utilisez une image en haute résolution (au moins 200x150px)
- Format PNG recommandé pour les logos

## 📊 Statistiques

Pistes pour suivre l'impact de la personnalisation:
- Nombre de clients ayant créé une carte après changement de design
- Temps d'engagement avec la carte
- Taux de conversion panier-fidélité

---

**Dernière mise à jour:** Avril 2026
**Version:** 1.0
