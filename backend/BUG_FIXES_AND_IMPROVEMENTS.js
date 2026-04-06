/**
 * Bug Fixes et Améliorations pour les Points/Stamps
 * 
 * À appliquer dans apiController.js et loyaltyController.js
 */

// ===== BUG FIX: Reward Logic =====
// PROBLÈME: Les rewards se déclenchent multiple fois avec modulo
// EXEMPLE: Si pointsForReward = 10, rewards à 10, 20, 30, etc.
// Mais C = (10 % 10), (20 % 10), (30 % 10) sont TOUS 0!

// AVANT (BUGUÉ):
// if (newPoints % pointsForReward === 0) {
//   response.rewardUnlocked = true;
// }

// APRÈS (CORRECT):
// Utiliser le seuil plutôt que modulo
const rewardsThreshold = Math.floor(newPoints / pointsForReward);
const previousThreshold = Math.floor((newPoints - pointsToAdd) / pointsForReward);
if (rewardsThreshold > previousThreshold) {
  response.rewardUnlocked = true;
}

// ===== IMPROVEMENT: Input Validation =====
// Ajout de validation de longueur à registerClientAndGeneratePass

const nom = req.body.nom?.trim();
const prenom = req.body.prenom?.trim();
const telephone = req.body.telephone?.trim();
const type_wallet = req.body.type_wallet?.toLowerCase();

// Validation
if (!nom || nom.length < 2 || nom.length > 50) {
  return res.status(400).json({ error: 'Nom: 2-50 caractères requis' });
}
if (!prenom || prenom.length < 2 || prenom.length > 50) {
  return res.status(400).json({ error: 'Prénom: 2-50 caractères requis' });
}
if (!telephone || !/^\+?[0-9\s\-()]{7,20}$/.test(telephone)) {
  return res.status(400).json({ error: 'Téléphone invalide' });
}
if (!['apple', 'google'].includes(type_wallet)) {
  return res.status(400).json({ error: 'Type de wallet invalide' });
}

// ===== CRITICAL: Session Creation Must Not Be Optional =====
// PROBLÈME: Session creation en try-catch optionnel peut échouer silencieusement
// 
// AVANT (PROBLÉMATIQUE):
// try {
//   await createSession(...);
// } catch (err) {
//   console.error('Session création optionnelle échouée');
//   // Continue quand même - inconsistency!
// }
// 
// APRÈS (CORRECT):
// Rendre session creation obligatoire ou au minimum vérifier après
try {
  await createSession(company.id, deviceFingerprint, deviceName, token, '24h');
  logger.debug('Session created');
} catch (err) {
  logger.error('Session creation failed - blocking login', { error: err.message });
  return res.status(503).json({ error: 'Service temporarily unavailable' });
}

// ===== IMPROVEMENT: Soft Delete au lieu de Hard Delete =====
// SUGGESTION: Dans deleteCompany, plutôt que DELETE, faire UPDATE avec soft_delete flag
// 
// CREATE TABLE IF NOT EXISTS entreprises (
//   ...
//   deleted_at TIMESTAMP NULL,
// );
//
// Lors de la suppression:
// UPDATE entreprises SET deleted_at = NOW() WHERE id = ?
// 
// Puis dans les SELECT, ajouter:
// WHERE deleted_at IS NULL

// ===== IMPROVEMENT: Proper Error Messages =====
// Ne jamais retourner le message d'erreur SQL au client
// 
// AVANT (DANGER):
// } catch (err) {
//   res.status(500).json({ error: 'Erreur serveur: ' + err.message });
//   // Client voit: "Erreur serveur: Connection timeout ECONNREFUSED"
// }
//
// APRÈS (SÉCURISÉ):
// } catch (err) {
//   logger.error('Database operation failed', {
//     error: err.message,
//     context: 'function_name'
//   });
//   res.status(500).json({ error: 'Erreur serveur' });
//   // Stack trace en logs seulement
// }

// ===== RECOMMENDATION: Add Transaction Support =====
// Pour les opérations multi-step (comme addStamps), utiliser transactions
// 
// try {
//   await pool.query('START TRANSACTION');
//   await pool.query('INSERT INTO customer_stamps ...');
//   await pool.query('INSERT INTO transaction_history ...');
//   await pool.query('COMMIT');
// } catch (err) {
//   await pool.query('ROLLBACK');
//   throw err;
// }

// ===== SECURITY: Parameterized Queries =====
// ✅ DÉJÀ BON: Tous les queries utilisent ? placeholders
// ✓ cible sont paramétrisés, pas de SQL injection possibke
// Vérifier simplement qu'aucun '${var}' ou "+var+" n'est utilisé
