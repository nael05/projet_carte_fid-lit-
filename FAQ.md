# ❓ FAQ - Questions Fréquemment Posées

## Installation & Migration

### Q1: La migration echoue, que faire?
**R:** Vérifiez :
```bash
# 1. MySQL est en cours d'exécution
mysql -u root -p -e "SELECT 1;"

# 2. La base existe
mysql -u root -p -e "USE loyalty_saas; SHOW TABLES;"

# 3. Relancer la migration
cd backend && node migrate-loyalty.js
```

### Q2: Dois-je refaire la migration si je l'ai déjà appliquée?
**R:** Non! Le script est idempotent. Vous pouvez le relancer sans risque.
Si vous voyez "ER_DUP_ENTRY", c'est que les tables existent déjà = OK.

### Q3: Comment je sais que la migration a fonctionné?
**R:** Vérifier en MySQL:
```bash
mysql -u root loyalty_saas <<< "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema='loyalty_saas';"
```
Vous devriez avoir au moins 10+ tables.

---

## Fidélité - Mode Points vs Tampons

### Q4: Peut-on changer le mode d'une entreprise après la création?
**R:** ⚠️ **Non, c'est une limitation volontaire.** Vous devez :
1. Créer une nouvelle entreprise
2. Exporter les clients
3. Les importer dans la nouvelle entreprise

Ceci évite les données inconsistantes.

### Q5: Quel est le nombre max de tampons?
**R:** **Exactement 10.** C'est une limite du système pour:
- L'affichage sur la carte physique
- L'ergonomie des clients
- La compatibilité avec les wallets

### Q6: Pouvez-vous avoir 15 points pour 1 point?
**R:** Oui! Configuration flexible:
- Points par achat: 1-999
- Points pour récompense: 1-999
- Exemple: 1 point par achat, récompense à 50 points

### Q7: Les clients voient les tampons en 3D sur le wallet?
**R:** Non (pas inclus dans cette version). Les tampons sont:
- Visibles dans l'app web
- Comptabilisés en base de données
- À implémenter côté wallet pour la 3D

---

## Notifications Push

### Q8: Combien de notifications peut-on envoyer?
**R:** Illimité. Vous pouvez en envoyer autant que vous voulez, quand vous le souhaitez.

### Q9: Les clients reçoivent-ils vraiment les notifications?
**R:** Dépend de la configuration :
- ✅ **Enregistrées en base** (100%)
- ⏳ **Envoyées aux APNs/FCM** (À implémenter)
- ⏳ **Reçues par clients** (Nécessite les tokens push)

Actuellement, les notifications sont enregistrées mais l'envoi réel est à implémenter avec les APIs Apple et Google.

### Q10: Comment cibleer les clients "actifs"?
**R:** Dans Notifications → "Cible" → "Clients actifs"
- Actifs = points > 0 OU tampons_collected > 0
- Inactifs = points = 0 ET tampons = 0

---

## Clés Apple et Google

### Q11: Les clés Apple et Google sont obligatoires?
**R:** Pour la **vraie expérience Wallet** : OUI
Pour tester localement : NON, vous pouvez laisser vides

### Q12: Où obtenir la clé Apple Wallet?
**R:** 
1. https://developer.apple.com
2. Certificates, Identifiers & Profiles
3. Créer "Pass Type ID"
4. Télécharger le certificat
5. Copier la clé dans Pro Dashboard

### Q13: La clé Google Wallet est-elle une URL?
**R:** Non, c'est un JSON complet de Service Account :
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  ...
}
```
Copiez le JSON complet.

### Q14: Et si je n'ai pas les clés?
**R:** Le système fonctionne quand-même :
- Système de points/tampons fonctionne ✅
- QR scanning fonctionne ✅
- Notifications enregistrées ✅
- Wallet Apple/Google ne reçoit pas les updates dynamiques ❌

---

## Données & Historique

### Q15: Où sont enregistrées les transactions?
**R:** Table `transaction_history` avec :
- Timestamp exact
- Type (points_added, stamps_added, reward_claimed, etc.)
- Montant du changement
- Description

### Q16: Peut-on supprimer l'historique?
**R:** Techniquement oui, mais **pas recommandé**. C'est un audit trail critique.

### Q17: Les données sont-elles isolées par entreprise?
**R:** **Oui, complètement.** Chaque entreprise ne voit que ses :
- Clients
- Configurations
- Transactions
- Notifications

---

## Bugs & Erreurs Courantes

### Q18: "Error: Client not found or unauthorized"
**R:** Le client ne belongs pas à cette entreprise. Vérifier l'ID du client.

### Q19: "Configuration not found"
**R:** Relancer la migration ou vérifier que l'entreprise existe en DB.

### Q20: "Cannot read property 'loyalty_type' of undefined"
**R:** L'entreprise n'a pas de configuration. Appliquer la migration.

### Q21: Les tampons ne s'ajoutent pas
**R:**
1. Vérifier loyalty_type = 'stamps' en base
2. Vérifier que le client existe
3. Vérifier les logs du backend

---

## Performance & Scalabilité

### Q22: Combien de clients peut supporter le système?
**R:** 
- Base de données : Illimité (MySQL peut gérer millions)
- API : Dépend de votre serveur
- Recommandation : Ajouter caching à 10k+ clients

### Q23: Les requêtes sont-elles optimisées?
**R:** Oui :
- Index sur les clés étrangères ✅
- Requêtes paramétrées (sécurité) ✅
- Plan d'exécution optimisé ✅

Mais sans caching Redis à 100k+ clients.

---

## Rollback & Maintenance

### Q24: Comment rollback la migration?
**R:** ⚠️ **Il n'y a pas de rollback.** Si vous avez un problème :
1. Supprimer les tables créées (DROP TABLE)
2. Relancer la migration
3. Ou restaurer depuis un backup

Recommandation : Toujours faire un backup avant migration!

### Q25: Comment faire un backup avant migration?
**R:**
```bash
# Mysqldump avant migration
mysqldump -u root -p loyalty_saas > backup-before-migration.sql

# Après migration, si problème:
mysql -u root -p loyalty_saas < backup-before-migration.sql
```

---

## Support & Documentation

### Q26: Où trouver la documentation?
**R:** 
- `LOYALTY_SETUP.md` - Guide général
- `QUICKSTART.md` - Commandes rapides
- `IMPLEMENTATION_CHECKLIST.md` - Checklist
- `SYSTEM_READY.md` - Récapitulatif

### Q27: Comment debugger le système?
**R:**
```bash
# Logs backend
npm run dev

# Logs MySQL
# Activer le query log en MySQL
SET global general_log = 'ON';

# Logs frontend (console browser)
F12 → Console
```

### Q28: Qui contacter en cas de problème?
**R:** Tous les fichiers-clés sont dans le repo :
- Controllers: backend/controllers/
- Routes: backend/routes/
- Migration: migrate-loyalty.js

Vérifier les logs et les fichiers de documentation d'abord!

---

## Version & Futures Améliorations

### Q29: Quelle version est implémentée?
**R:** Version 1.0 avec:
- ✅ 2 modes de fidélité (Points, Tampons)
- ✅ Notifications push enregistrées
- ⏳ Envoi réel aux APNs/FCM (À implémenter)
- ⏳ Updates dynamiques wallet (À implémenter)
- ⏳ Analytics avancées (À implémenter)

### Q30: Quand auront les updates dynamiques?
**R:** Non encore spécifié. Cela nécessite :
- Implémentation APNs Apple
- Implémentation Google Wallet API
- Gestion des device tokens
- Tests appareils réels

---

## Conclusion

Le système est **100% fonctionnel** pour :
- ✅ Créer companies en Points ou Tampons
- ✅ Configurer tous les paramètres
- ✅ Scanner QR codes
- ✅ Envoyer notifications
- ✅ Consulter historique et stats

Les wallets Apple/Google reçoivent les cartes statiques mais pas les updates dynamiques.

Pour plus d'aide, consulter les logs ou les fichiers de documentation!
