-- Supprime l'ancienne colonne si elle a été créée par erreur, ajoute la bonne
ALTER TABLE loyalty_config
  DROP COLUMN IF EXISTS max_points_per_transaction;

ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS max_points_balance INT NULL DEFAULT NULL
  COMMENT 'Solde maximum de points qu\'un client peut atteindre. NULL = pas de limite.';
