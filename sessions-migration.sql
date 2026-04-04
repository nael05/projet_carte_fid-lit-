-- Table pour tracker les sessions par appareil
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
    UNIQUE KEY unique_device (entreprise_id, device_id)
);
