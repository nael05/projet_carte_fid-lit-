-- Ajoute la colonne points_shortcuts dans loyalty_config (stockage JSON des raccourcis personnalisés)
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'loyalty_config'
  AND COLUMN_NAME = 'points_shortcuts'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE loyalty_config ADD COLUMN points_shortcuts TEXT NULL DEFAULT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
