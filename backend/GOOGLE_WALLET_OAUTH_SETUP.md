# 🔐 GOOGLE WALLET OAUTH - GUIDE COMPLET

## Le Problème Résolu ✅

L'Issuer `3388000000023110060` que tu as créé manuellement **n'avait pas les permissions** pour la Service Account `fidelite-saas-531@saas-fidelite.iam.gserviceaccount.com`.

**Solution:** Utiliser **OAuth avec ton compte Gmail personnel** au lieu de la Service Account!

---

## Étapes à Suivre

### 1️⃣ Première Authentification (5 min)

```bash
cd backend
npm run setup-oauth
```

Cela va:
- Ouvrir une page d'authentification Google
- Te demander d'accepter les permissions
- Sauvegarder un token OAuth automatiquement
- Fermer le navigateur

**Important:** Utilise le compte Gmail qui gère ton Issuer `3388000000023110060`!

### 2️⃣ Redémarrer le Serveur

```bash
npm start
```

Le serveur va charger le token OAuth automatiquement.

### 3️⃣ Tester la Génération de Cartes

```bash
node test-google-wallet-end-to-end.js
```

Ça devrait maintenant générer les cartes **sans erreurs**! 🎉

---

## Avantages de cette Approche

✅ **Plus de 403 Permission Denied**
✅ **Utilise ton Issuer existant** (3388000000023110060)
✅ **Token valide pendant 1h** (auto-refresh ensuite)
✅ **Aucune configuration manuelle** après première auth

---

## Fichiers Générés

- `certs/google-wallet-refresh-token.txt` - Token de rafraîchissement (à garder secret!)

## Troubleshooting

| Erreur | Solution |
|--------|----------|
| "Token OAuth non disponible" | Lance `npm run setup-oauth` pour t'authentifier |
| OAuth page ne s'ouvre pas | Copie-colle l'URL manuellement dans le navigateur |
| "Invalid redirect_uri" | Vérifie que le port 5000 n'est pas utilisé |

---

## C'est Tout! 🚀

L'authentification est maintenant faite. Les cartes Google Wallet vont se générer avec succès!

Si tu veux tester à nouveau:
```bash
node test-google-wallet-end-to-end.js
```
