-- Compatible MySQL 5.7+
-- Supprime l'ancienne colonne si elle existe
SET @exist_old := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'loyalty_config'
  AND COLUMN_NAME = 'max_points_per_transaction'
);
SET @sql_drop := IF(@exist_old > 0,
  'ALTER TABLE loyalty_config DROP COLUMN max_points_per_transaction',
  'SELECT 1'
);
PREPARE stmt FROM @sql_drop;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ajoute la nouvelle colonne si elle n'existe pas
SET @exist_new := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'loyalty_config'
  AND COLUMN_NAME = 'max_points_balance'
);
SET @sql_add := IF(@exist_new = 0,
  'ALTER TABLE loyalty_config ADD COLUMN max_points_balance INT NULL DEFAULT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_add;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
