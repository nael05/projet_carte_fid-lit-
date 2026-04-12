-- database_init.sql - Schéma complet pour Fidelyz Production

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table ENTREPRISES
CREATE TABLE IF NOT EXISTS `entreprises` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `loyalty_type` enum('points','stamps') DEFAULT 'points',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table CLIENTS
CREATE TABLE IF NOT EXISTS `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entreprise_id` int(11) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `points` int(11) DEFAULT '0',
  `type_wallet` enum('apple','google') DEFAULT 'apple',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `entreprise_id` (`entreprise_id`),
  CONSTRAINT `clients_ibfk_1` FOREIGN KEY (`entreprise_id`) REFERENCES `entreprises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table LOYALTY_CONFIG
CREATE TABLE IF NOT EXISTS `loyalty_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `entreprise_id` int(11) NOT NULL,
  `points_for_reward` int(11) DEFAULT '100',
  `stamps_for_reward` int(11) DEFAULT '10',
  `reward_description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `entreprise_id` (`entreprise_id`),
  CONSTRAINT `loyalty_config_ibfk_1` FOREIGN KEY (`entreprise_id`) REFERENCES `entreprises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table CARD_CUSTOMIZATION
CREATE TABLE IF NOT EXISTS `card_customization` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `icon_url` varchar(255) DEFAULT NULL,
  `strip_image_url` varchar(255) DEFAULT NULL,
  `primary_color` varchar(20) DEFAULT '#3b82f6',
  `text_color` varchar(20) DEFAULT '#ffffff',
  `accent_color` varchar(20) DEFAULT '#60a5fa',
  `card_subtitle` varchar(255) DEFAULT 'Carte de Fidélité',
  `apple_organization_name` varchar(255) DEFAULT 'Fidelyz',
  `logo_text` varchar(255) DEFAULT NULL,
  -- Champs Google Specifiques
  `google_primary_color` varchar(20) DEFAULT '#3b82f6',
  `google_text_color` varchar(20) DEFAULT '#ffffff',
  `google_logo_url` varchar(255) DEFAULT NULL,
  `google_hero_image_url` varchar(255) DEFAULT NULL,
  `google_card_title` varchar(255) DEFAULT NULL,
  `google_card_subtitle` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_id` (`company_id`),
  CONSTRAINT `card_customization_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `entreprises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table CUSTOMER_STAMPS (Pour le mode tampons)
CREATE TABLE IF NOT EXISTS `customer_stamps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `client_id` int(11) NOT NULL,
  `stamps_collected` int(11) DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_id` (`client_id`),
  CONSTRAINT `customer_stamps_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table WALLET_CARDS (Suivi des passes générés)
CREATE TABLE IF NOT EXISTS `wallet_cards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `client_id` int(11) NOT NULL,
  `type_wallet` enum('apple','google') NOT NULL,
  `pass_serial_number` varchar(255) NOT NULL,
  `push_token` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `wallet_cards_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table ADMINS
CREATE TABLE IF NOT EXISTS `admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('superadmin','support') DEFAULT 'superadmin',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Données initiales pour tester (Admin: admin / password: admin)
INSERT IGNORE INTO `admins` (`id`, `username`, `password`) VALUES (1, 'admin', '$2b$10$f6B0rO7U6uI6k6jJvN.5.OE5ZJv7W.zZ6Xz6lA9jA9J9J9J9J9J9J');

SET FOREIGN_KEY_CHECKS = 1;
