-- =========================================================================
-- FIDELYZ CLEAN DATABASE SETUP v3.0
-- =========================================================================
-- This script performs a complete clean wipe and recreation of the database.
-- =========================================================================

DROP DATABASE IF EXISTS loyalty_saas;
CREATE DATABASE loyalty_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE loyalty_saas;

SET FOREIGN_KEY_CHECKS=0;

-- 1. SUPER ADMINS
CREATE TABLE super_admins (
    id VARCHAR(36) PRIMARY KEY,
    identifiant VARCHAR(50) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. ENTREPRISES
CREATE TABLE entreprises (
    id VARCHAR(36) PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    prenom VARCHAR(255),
    telephone VARCHAR(20),
    mot_de_passe VARCHAR(255) NOT NULL,
    temporary_password VARCHAR(255),
    must_change_password BOOLEAN DEFAULT TRUE,
    statut ENUM('actif', 'suspendu') DEFAULT 'actif',
    loyalty_type ENUM('points', 'stamps') DEFAULT 'points',
    recompense_definition VARCHAR(255) DEFAULT 'Une surprise vous attend !',
    last_login TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_statut (statut),
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- 3. LOYALTY CONFIGURATION
CREATE TABLE loyalty_config (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL UNIQUE,
    loyalty_type ENUM('points', 'stamps') DEFAULT 'points',
    
    -- Points config
    points_per_purchase INT DEFAULT 10,
    points_for_reward INT DEFAULT 100,
    points_adding_mode ENUM('manual', 'automatic') DEFAULT 'manual',
    
    -- Stamps config
    stamps_count INT DEFAULT 10,
    stamps_per_purchase INT DEFAULT 1,
    stamps_for_reward INT DEFAULT 10,
    
    -- General Reward info
    reward_title VARCHAR(255) DEFAULT 'Récompense spéciale',
    reward_description TEXT,
    
    -- Wallet Keys
    apple_wallet_key LONGTEXT,
    google_wallet_key LONGTEXT,
    
    -- Features
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. CARD CUSTOMIZATION
CREATE TABLE card_customization (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    loyalty_type ENUM('points', 'stamps') NOT NULL,
    
    -- Global colors
    primary_color VARCHAR(20) DEFAULT '#1f2937',
    secondary_color VARCHAR(20) DEFAULT '#374151',
    accent_color VARCHAR(20) DEFAULT '#3b82f6',
    text_color VARCHAR(20) DEFAULT '#ffffff',
    
    -- Shared assets
    logo_url TEXT,
    icon_url TEXT,
    strip_image_url TEXT,
    logo_text VARCHAR(100),
    card_title VARCHAR(100),
    card_subtitle VARCHAR(100),
    footer_text VARCHAR(100),
    
    -- Apple Wallet Specifics
    apple_organization_name VARCHAR(100),
    apple_pass_description TEXT,
    apple_background_color VARCHAR(20),
    apple_text_color VARCHAR(20),
    apple_label_color VARCHAR(20),
    apple_logo_url TEXT,
    apple_icon_url TEXT,
    apple_strip_image_url TEXT,
    
    -- Google Wallet Specifics
    google_primary_color VARCHAR(20) DEFAULT '#1f2937',
    google_text_color VARCHAR(20) DEFAULT '#ffffff',
    google_logo_url TEXT,
    google_hero_image_url TEXT,
    google_card_title VARCHAR(100),
    google_card_subtitle VARCHAR(100),
    
    -- Back fields (Apple Wallet)
    back_fields_info TEXT,
    back_fields_terms TEXT,
    back_fields_website TEXT,
    back_fields_phone VARCHAR(20),
    back_fields_address TEXT,
    back_fields_instagram VARCHAR(100),
    back_fields_facebook VARCHAR(100),
    back_fields_tiktok VARCHAR(100),
    
    -- Location features
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    relevant_text VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    UNIQUE KEY unique_company_loyalty (company_id, loyalty_type)
) ENGINE=InnoDB;

-- 5. CLIENTS
CREATE TABLE clients (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    telephone VARCHAR(20) NOT NULL,
    points INT DEFAULT 0,
    type_wallet ENUM('apple', 'google', 'none') DEFAULT 'none',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    INDEX idx_phone (telephone),
    INDEX idx_entreprise (entreprise_id)
) ENGINE=InnoDB;

-- 6. SESSIONS
CREATE TABLE sessions (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    token_hash VARCHAR(255) NOT NULL,
    session_version INT DEFAULT 1,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    UNIQUE KEY unique_device_session (entreprise_id, device_id)
) ENGINE=InnoDB;

-- 7. TRANSACTION HISTORY
CREATE TABLE transaction_history (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    entreprise_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'points_added', 'redeem_points', 'stamps_added', etc.
    points_change INT DEFAULT 0,
    stamps_change INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- 8. REWARD TIERS (Palier de récompenses)
CREATE TABLE reward_tiers (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    points_required INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    INDEX idx_points (points_required)
) ENGINE=InnoDB;

-- 9. WALLET CARDS (Serial numbers management)
CREATE TABLE wallet_cards (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    company_id VARCHAR(36) NOT NULL,
    pass_serial_number VARCHAR(255) NOT NULL UNIQUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. APPLE PASS REGISTRATIONS
CREATE TABLE apple_pass_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_library_identifier VARCHAR(255) NOT NULL,
    push_token VARCHAR(255) NOT NULL,
    pass_type_identifier VARCHAR(255) NOT NULL,
    pass_serial_number VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_registration (device_library_identifier, pass_serial_number)
) ENGINE=InnoDB;

-- 11. PUSH NOTIFICATIONS SENT (Global History)
CREATE TABLE push_notifications_sent (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_type ENUM('all', 'segment', 'specific') DEFAULT 'all',
    target_segment VARCHAR(100),
    status ENUM('draft', 'scheduled', 'sent', 'failed') DEFAULT 'draft',
    recipients_count INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    sent_at TIMESTAMP NULL,
    scheduled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. CLIENT PUSH NOTIFICATIONS (Per client status)
CREATE TABLE client_push_notifications (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    notification_id VARCHAR(36) NOT NULL,
    push_token VARCHAR(500),
    device_type ENUM('ios', 'android') DEFAULT 'android',
    status ENUM('pending', 'sent', 'delivered', 'failed', 'opened') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES push_notifications_sent(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS=1;

-- =========================================================================
-- INITIAL DATA
-- =========================================================================

-- Generate a hardcoded master admin for initial access
INSERT INTO super_admins (id, identifiant, mot_de_passe) 
VALUES (
    'admin-master-001',
    'master_admin',
    '$2b$10$Bv2X9D.F8Z/8E2QF5q0h2eP1Y7T9V6Z3K5L4M1N2O3P4Q5R6S7T8U' -- password: admin
) ON DUPLICATE KEY UPDATE id=id;

-- Summary query
SELECT 'Database loyalty_saas successfully recreated!' as Message;
SELECT TABLE_NAME as Tables_Created FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'loyalty_saas';
