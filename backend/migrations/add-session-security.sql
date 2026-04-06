-- Migration: Add session security improvements
-- Purpose: Better session management and security

-- Add session version for invalidation support
ALTER TABLE sessions ADD COLUMN session_version INT DEFAULT 1;

-- Add created/updated timestamps if not exists
ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Ensure entreprises has all necessary security fields
ALTER TABLE entreprises ADD COLUMN last_login TIMESTAMP NULL;
ALTER TABLE entreprises ADD COLUMN login_attempts INT DEFAULT 0;
ALTER TABLE entreprises ADD COLUMN locked_until TIMESTAMP NULL;

-- Create audit log table for security
CREATE TABLE IF NOT EXISTS security_audit (
  id VARCHAR(36) PRIMARY KEY,
  entreprise_id VARCHAR(36),
  action VARCHAR(100),
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entreprise_id (entreprise_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
);
