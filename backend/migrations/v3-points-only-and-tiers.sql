-- Passage au système 100% Points et Paliers Dynamiques

-- 1. Ajout des colonnes de mode d'ajout de points dans loyalty_config
SET @dbname = DATABASE();
SET @tablename = 'loyalty_config';
SET @columnname = 'points_adding_mode';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
     AND TABLE_NAME = @tablename
     AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE loyalty_config ADD COLUMN points_adding_mode ENUM(''auto'', ''manual'') DEFAULT ''auto'''
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Création de la table des paliers de récompenses (Reward Tiers)
CREATE TABLE IF NOT EXISTS reward_tiers (
  id VARCHAR(36) PRIMARY KEY,
  entreprise_id VARCHAR(36) NOT NULL,
  points_required INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Migration des récompenses uniques existantes vers la nouvelle table
-- Pour éviter les doublons on insère seulement s'il n'y a pas déjà de tiers pour l'entreprise
INSERT INTO reward_tiers (id, entreprise_id, points_required, title, description)
SELECT UUID(), entreprise_id, 
       COALESCE(points_for_reward, 100), 
       COALESCE(reward_title, 'Récompense'), 
       reward_description
FROM loyalty_config
WHERE entreprise_id NOT IN (SELECT DISTINCT entreprise_id FROM reward_tiers)
  AND (reward_title IS NOT NULL OR reward_description IS NOT NULL);

-- 4. Nettoyage des tables et colonnes liées aux tampons (On DROP pour s'assurer que le code n'y touche plus)
DROP TABLE IF EXISTS customer_stamps;

ALTER TABLE entreprises DROP COLUMN IF EXISTS loyalty_type;

ALTER TABLE loyalty_config DROP COLUMN IF EXISTS loyalty_type;
ALTER TABLE loyalty_config DROP COLUMN IF EXISTS stamps_count;
ALTER TABLE loyalty_config DROP COLUMN IF EXISTS stamps_per_purchase;
ALTER TABLE loyalty_config DROP COLUMN IF EXISTS stamps_for_reward;
ALTER TABLE loyalty_config DROP COLUMN IF EXISTS reward_title;
ALTER TABLE loyalty_config DROP COLUMN IF EXISTS reward_description;
ALTER TABLE loyalty_config DROP COLUMN IF EXISTS points_for_reward;
