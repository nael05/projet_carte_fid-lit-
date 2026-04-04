-- =========================================================================
-- LOYALTYCORE SAAS v2.0 - BASE DE DONNÉES COMPLÈTE
-- =========================================================================
-- Fichier SQL complet à copier-coller dans phpMyAdmin
-- Crée une base de données complète et bien structurée
-- =========================================================================

CREATE DATABASE IF NOT EXISTS loyalty_saas;
USE loyalty_saas;

SET FOREIGN_KEY_CHECKS=0;

-- =========================================================================
-- 1. TABLES DE BASE
-- =========================================================================

CREATE TABLE IF NOT EXISTS super_admins (
    id VARCHAR(36) PRIMARY KEY,
    identifiant VARCHAR(50) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entreprises (
    id VARCHAR(36) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    statut ENUM('actif', 'suspendu') DEFAULT 'actif',
    loyalty_type ENUM('points', 'stamps') DEFAULT 'points',
    recompense_definition VARCHAR(255) DEFAULT 'Une surprise vous attend !',
    must_change_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_statut (statut),
    INDEX idx_loyalty_type (loyalty_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    points INT DEFAULT 0,
    type_wallet ENUM('apple', 'google') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    INDEX idx_entreprise (entreprise_id),
    INDEX idx_telephone (telephone),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 2. TABLES DE FIDÉLITÉ
-- =========================================================================

CREATE TABLE IF NOT EXISTS loyalty_config (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL UNIQUE,
    loyalty_type ENUM('points', 'stamps') DEFAULT 'points',
    points_per_purchase INT DEFAULT 1,
    points_for_reward INT DEFAULT 10,
    stamps_count INT DEFAULT 10,
    stamps_per_purchase INT DEFAULT 1,
    stamps_for_reward INT DEFAULT 10,
    reward_title VARCHAR(255) DEFAULT 'Recompense',
    reward_description TEXT,
    apple_wallet_key LONGTEXT,
    google_wallet_key LONGTEXT,
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    INDEX idx_entreprise (entreprise_id),
    INDEX idx_loyalty_type (loyalty_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_stamps (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    entreprise_id VARCHAR(36) NOT NULL,
    stamps_collected INT DEFAULT 0,
    stamps_redeemed INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    UNIQUE KEY unique_client (client_id),
    INDEX idx_entreprise (entreprise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 3. TABLES DE PERSONNALISATION
-- =========================================================================

CREATE TABLE IF NOT EXISTS card_customization (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    loyalty_type ENUM('points', 'stamps') NOT NULL,
    primary_color VARCHAR(7) DEFAULT '#2563eb',
    secondary_color VARCHAR(7) DEFAULT '#1e40af',
    accent_color VARCHAR(7) DEFAULT '#dbeafe',
    text_color VARCHAR(7) DEFAULT '#111827',
    logo_url TEXT,
    background_pattern VARCHAR(50) DEFAULT 'solid',
    card_title VARCHAR(100),
    card_subtitle VARCHAR(100),
    footer_text VARCHAR(100),
    show_qr_code BOOLEAN DEFAULT TRUE,
    show_barcode BOOLEAN DEFAULT TRUE,
    show_progress_bar BOOLEAN DEFAULT TRUE,
    apple_wallet_enabled BOOLEAN DEFAULT FALSE,
    google_wallet_enabled BOOLEAN DEFAULT FALSE,
    apple_pkpass_id VARCHAR(100),
    google_pass_class_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    UNIQUE KEY unique_company_loyalty (company_id, loyalty_type),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 4. TABLES DE SESSION & DEVICES
-- =========================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    device_name VARCHAR(100),
    token_hash VARCHAR(255) NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    UNIQUE KEY unique_device (entreprise_id, device_id),
    INDEX idx_entreprise (entreprise_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 5. TABLES D'HISTORIQUE
-- =========================================================================

CREATE TABLE IF NOT EXISTS transaction_history (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    entreprise_id VARCHAR(36) NOT NULL,
    type ENUM('add_points', 'redeem_points', 'add_stamps', 'redeem_stamps', 'reward_unlocked'),
    points_change INT,
    stamps_change INT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    INDEX idx_client (client_id),
    INDEX idx_entreprise (entreprise_id),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 6. TABLES DE NOTIFICATIONS
-- =========================================================================

CREATE TABLE IF NOT EXISTS push_notifications_sent (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    target_type ENUM('all', 'segment') DEFAULT 'all',
    target_segment VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('draft', 'sent', 'scheduled') DEFAULT 'draft',
    client_count INT,
    sent_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    INDEX idx_entreprise (entreprise_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 7. DONNÉES INITIALES
-- =========================================================================

INSERT INTO super_admins (id, identifiant, mot_de_passe) 
VALUES (
  'admin-master-001',
  'master_admin',
  '$2b$10$Bv2X9D.F8Z/8E2QF5q0h2eP1Y7T9V6Z3K5L4M1N2O3P4Q5R6S7T8U'
)
ON DUPLICATE KEY UPDATE id=id;

-- =========================================================================
-- 8. VÉRIFICATION
-- =========================================================================

SELECT 'Base de donnees loyalty_saas creee avec succes' AS status;
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'loyalty_saas' ORDER BY TABLE_NAME;
