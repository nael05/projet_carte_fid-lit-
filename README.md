# SaaS Fidélité B2B2C

Plateforme permettant aux commerçants de scanner des cartes de fidélité Apple Wallet et d'attribuer des points à leurs clients.

## Structure du projet

Le projet est divisé en deux parties :
- **Backend** : API Node.js/Express avec MySQL et génération de pass Apple Wallet.
- **Frontend** : Application React/Vite (Scanner, Login, Inscription Client).

## Prérequis

- Node.js installé
- Serveur MySQL
- Compte Apple Developer (pour les certificats Wallet)

## Installation Backend

1. Créer la base de données avec le fichier `schema.sql`.
2. Installer les dépendances :
   ```bash
   npm install