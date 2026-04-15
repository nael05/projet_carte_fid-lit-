-- v4-add-enterprise-contact-info.sql
-- Ajout des informations de contact personnelles pour les gérants de commerce

-- 1. Ajout de la colonne prenom
ALTER TABLE `entreprises` ADD COLUMN `prenom` VARCHAR(100) DEFAULT NULL AFTER `nom`;

-- 2. Ajout de la colonne telephone
ALTER TABLE `entreprises` ADD COLUMN `telephone` VARCHAR(20) DEFAULT NULL AFTER `prenom`;

-- Note: Ces champs sont optionnels (DEFAULT NULL) pour préserver la compatibilité avec les anciens commerces.
