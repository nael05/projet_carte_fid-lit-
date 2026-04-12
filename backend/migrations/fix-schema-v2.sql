-- Correction du schéma pour Fidelyz
-- Ajout des colonnes manquantes et création de la table d'historique

-- 1. Table transaction_history
CREATE TABLE IF NOT EXISTS transaction_history (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    entreprise_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'add_points', 'add_stamps', 'reward_claimed', etc.
    points_change INT DEFAULT 0,
    stamps_change INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Mise à jour de loyalty_config
-- Vérifier si stamps_count existe avant d'ajouter
SET @dbname = DATABASE();
SET @tablename = 'loyalty_config';
SET @columnname = 'stamps_count';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
     AND TABLE_NAME = @tablename
     AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE loyalty_config ADD COLUMN stamps_count INT DEFAULT 10'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Mise à jour de customer_stamps
SET @tablename = 'customer_stamps';
SET @columnname = 'entreprise_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
     AND TABLE_NAME = @tablename
     AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE customer_stamps ADD COLUMN entreprise_id VARCHAR(36)'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. S'assurer que les IDs sont VARCHAR(36) pour le nouveau système UUID
ALTER TABLE customer_stamps MODIFY id VARCHAR(36);
ALTER TABLE customer_stamps MODIFY client_id VARCHAR(36);
ALTER TABLE loyalty_config MODIFY id VARCHAR(36);
ALTER TABLE loyalty_config MODIFY entreprise_id VARCHAR(36);
