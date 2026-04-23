ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS max_points_per_transaction INT NULL DEFAULT NULL
  COMMENT 'Plafond de points par transaction. NULL = pas de limite.';
