-- Migration: Add database indexes for performance optimization
-- Date: 2024

-- Indexes on foreign keys (for faster JOINs)
CREATE INDEX idx_clients_entreprise_id ON clients(entreprise_id);
CREATE INDEX idx_clients_telephone ON clients(telephone);
CREATE INDEX idx_sessions_entreprise_id ON sessions(entreprise_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_transaction_history_client_id ON transaction_history(client_id);
CREATE INDEX idx_transaction_history_entreprise_id ON transaction_history(entreprise_id);
CREATE INDEX idx_customer_stamps_client_id ON customer_stamps(client_id);
CREATE INDEX idx_customer_stamps_entreprise_id ON customer_stamps(entreprise_id);
CREATE INDEX idx_loyalty_config_entreprise_id ON loyalty_config(entreprise_id);
CREATE UNIQUE INDEX idx_loyalty_config_unique ON loyalty_config(entreprise_id);
CREATE INDEX idx_card_customization_entreprise_id ON card_customization(entreprise_id);
CREATE INDEX idx_push_notifications_entreprise_id ON push_notifications(entreprise_id);
CREATE INDEX idx_push_notification_logs_entreprise_id ON push_notification_logs(entreprise_id);

-- Add created_at indexes for sorting
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX idx_transaction_history_created_at ON transaction_history(created_at DESC);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- Combined indexes for common queries
CREATE INDEX idx_clients_entreprise_created ON clients(entreprise_id, created_at DESC);
CREATE INDEX idx_transaction_histoire_entreprise_created ON transaction_history(entreprise_id, created_at DESC);
