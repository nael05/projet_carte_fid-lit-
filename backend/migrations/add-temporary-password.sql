-- =========================================================================
-- MIGRATION: Ajouter le champ temporary_password aux entreprises
-- =========================================================================
-- Cette migration ajoute la capacité de stocker et afficher les mots de passe
-- temporaires pour les entreprises fraîchement créées.
-- 
-- À exécuter si vous avez une base de données existante sans ce champ
-- =========================================================================

ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS temporary_password VARCHAR(255) AFTER mot_de_passe;

-- Optionnel: Ajouter un index si vous avez beaucoup d'entreprises
-- ALTER TABLE entreprises ADD INDEX idx_temp_password (temporary_password);

-- Vérification
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'entreprises' AND TABLE_SCHEMA = 'loyalty_saas' 
AND COLUMN_NAME = 'temporary_password';
