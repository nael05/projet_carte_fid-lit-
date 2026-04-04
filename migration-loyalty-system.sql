-- ===== MIGRATION: Système de Fidélité Complet =====
-- Date: 2026-04-04
-- Ajoute support pour Points vs Tampons, notifications push, clés wallet

-- 1. Ajouter les colonnes de fidélité à la table entreprises
ALTER TABLE entreprises 
ADD COLUMN IF NOT EXISTS loyalty_type ENUM('points', 'stamps') DEFAULT 'points',
ADD COLUMN IF NOT EXISTS points_per_purchase INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS points_for_reward INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS stamps_count INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS stamps_per_purchase INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS stamps_for_reward INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS apple_wallet_key TEXT,
ADD COLUMN IF NOT EXISTS google_wallet_key TEXT,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. Table pour la configuration détaillée de la fidélité
CREATE TABLE IF NOT EXISTS loyalty_config (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL UNIQUE,
    loyalty_type ENUM('points', 'stamps') DEFAULT 'points',
    
    -- Configuration Points
    points_per_purchase INT DEFAULT 1,
    points_for_reward INT DEFAULT 10,
    
    -- Configuration Tampons
    stamps_count INT DEFAULT 10,
    stamps_per_purchase INT DEFAULT 1,
    stamps_for_reward INT DEFAULT 10,
    
    -- Description de la récompense
    reward_title VARCHAR(255) DEFAULT 'Récompense',
    reward_description TEXT,
    
    -- Clés Wallet
    apple_wallet_key TEXT,
    google_wallet_key TEXT,
    
    -- Notifications
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
);

-- 3. Table pour tracker les tampons des clients
CREATE TABLE IF NOT EXISTS customer_stamps (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    entreprise_id VARCHAR(36) NOT NULL,
    stamps_collected INT DEFAULT 0,
    stamps_redeemed INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    UNIQUE KEY unique_client_stamps (client_id)
);

-- 4. Table pour tracer les notifications push envoyées
CREATE TABLE IF NOT EXISTS push_notifications_sent (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_type ENUM('all', 'segment', 'specific') DEFAULT 'all',
    target_segment VARCHAR(100),
    recipients_count INT DEFAULT 0,
    status ENUM('draft', 'scheduled', 'sent', 'failed') DEFAULT 'draft',
    scheduled_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
);

-- 5. Table pour tracker les notifications par client
CREATE TABLE IF NOT EXISTS client_push_notifications (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    notification_id VARCHAR(36) NOT NULL,
    push_token VARCHAR(500),
    device_type ENUM('ios', 'android') DEFAULT 'android',
    status ENUM('pending', 'sent', 'failed', 'opened') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES push_notifications_sent(id) ON DELETE CASCADE
);

-- 6. Table pour les historiques des transactions
CREATE TABLE IF NOT EXISTS transaction_history (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    entreprise_id VARCHAR(36) NOT NULL,
    type ENUM('points_added', 'points_redeemed', 'stamps_added', 'stamps_redeemed', 'reward_claimed') DEFAULT 'points_added',
    points_change INT DEFAULT 0,
    stamps_change INT DEFAULT 0,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
);

-- 7. Index pour performance
CREATE INDEX IF NOT EXISTS idx_loyalty_config_entreprise ON loyalty_config(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_customer_stamps_client ON customer_stamps(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_stamps_entreprise ON customer_stamps(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_entreprise ON push_notifications_sent(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_client_push_notifications_client ON client_push_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_push_notifications_notification ON client_push_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_client ON transaction_history(client_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_entreprise ON transaction_history(entreprise_id);
