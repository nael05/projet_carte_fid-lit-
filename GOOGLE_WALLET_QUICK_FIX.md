# ⚡ GOOGLE WALLET - QUICK FIX (5 MIN)

## ✅ Vérification complétée

Vos credentials Google sont **100% VALIDES** ✓

```
Projet: saas-fidelite  
Service Account: fidelite-saas-531@saas-fidelite.iam.gserviceaccount.com  
JWT Generation: ✅ FONCTIONNE  
API Call: ❌ Manque activation Google Cloud
```

---

## 🚀 3 Étapes pour FIXER

### **1. Activez Google Wallet API (2 min)**
1. Ouvrez: https://console.cloud.google.com/
2. Sélectionnez le projet: **"saas-fidelite"** (en haut ↑)
3. Menu ☰ → **APIs et services** → **Bibliothèque** (ou "Activer les APIs")
4. Cherchez **"Google Wallet API"**
5. Cliquez **"ACTIVER"**

### **2. Assignez les permissions (2 min)**

⚠️ **ATTENTION**: Tu ne dois PAS être dans "Rôles" (où tu vois "Créer un rôle")

Clique sur **"Contrôle d'accès (IAM)"** dans le menu de gauche ← C'EST ICI!

Une fois dedans:
1. Cliquez le bouton **"Attribuer l'accès"** (en haut - bouton bleu)
2. Dans le champ "Nouveaux principaux":
   - Copiez-collez: `fidelite-saas-531@saas-fidelite.iam.gserviceaccount.com`
3. Cliquez "Sélectionner un rôle"
4. Cherchez: `Wallet Objects Admin`
5. Cliquez **"Enregistrer"**

### **3. Attendez 1-2 min et testez 👇**

```bash
cd backend
node test-google-wallet-full.js
```

---

## 📌 Solutions si ça échoue

| Erreur | Solution |
|--------|----------|
| "API not enabled" | Vérifiez que Google Wallet API est bien activée |
| "Insufficient Permissions" | Service Account a besoin du rôle "Wallet Objects Admin" |
| "Invalid Issuer" | Configurez issuer: https://pay.google.com/gp/m/issuer |
| Toujours "Bad Request" | Attendez 5 min et réessayez (propagation Google) |

---

## ✨ Après FIX

Une fois tout OK, ces commandes devraient retourner **✅ PASS GÉNÉRÉ**:

```bash
# Test complet
node backend/test-google-wallet-full.js

# Test simple  
npm test
```

---

**Temps estimé**: 5-10 minutes  
**Difficulté**: Très facile (juste des clicks dans Google Console)  
**Support**: Voir GOOGLE_WALLET_SETUP_GUIDE.md pour détails
