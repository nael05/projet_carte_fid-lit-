-- Migration: Apple Wallet Tables for Pass Kit Integration
-- Description: Ajoute les tables nécessaires pour gérer les passes Apple Wallet et les notifications push

-- Table 1: wallet_cards
-- Stocke l'état actuel de la carte de fidélité du client
CREATE TABLE IF NOT EXISTS wallet_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  client_id INT NOT NULL UNIQUE COMMENT 'Référence au client (unique: 1 client = 1 carte)',
  company_id INT NOT NULL COMMENT 'Entreprise propriétaire',
  
  pass_serial_number VARCHAR(100) NOT NULL UNIQUE COMMENT 'Identifiant unique du pass Apple Wallet',
  authentication_token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Token d\'authentification pour les requêtes Apple',
  
  points_balance INT DEFAULT 0 COMMENT 'Solde actuel de points',
  stamps_balance INT DEFAULT 0 COMMENT 'Solde actuel de tampons (si applicable)',
  
  qr_code_value VARCHAR(255) NOT NULL COMMENT 'Valeur du QR code (généralement clientId)',
  
  pass_file_path VARCHAR(255) COMMENT 'Chemin du fichier .pkpass généré',
  pass_file_expiry DATETIME COMMENT 'Date d\'expiration du fichier',
  
  wallet_added_at DATETIME COMMENT 'Date/heure d\'ajout du pass au walletl',
  last_pass_generated_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Quand le pass a été généré pour la dernière fois',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES enterprises(id),
  INDEX idx_serial_number (pass_serial_number),
  INDEX idx_token (authentication_token),
  INDEX idx_company_client (company_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: apple_pass_registrations
-- CRITIQUE: Stocke les appareils enregistrés auprès d'Apple pour recevoir les mises à jour push
-- Un même pass peut être enregistré sur plusieurs appareils (iPhone + Apple Watch)
CREATE TABLE IF NOT EXISTS apple_pass_registrations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  pass_serial_number VARCHAR(100) NOT NULL COMMENT 'Référence au pass (FK wallet_cards)',
  device_library_identifier VARCHAR(255) NOT NULL COMMENT 'Identifiant unique de l\'appareil iOS (fourni par Apple)',
  
  push_token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Token APNs pour envoyer les notifications push',
  
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_notified_at DATETIME COMMENT 'Quand ce device a reçu la dernière notification',
  last_sync_at DATETIME COMMENT 'Quand ce device a synchronisé les données',
  
  -- Tag pour gestion des mises à jour (Apple Wallet requête: passesUpdatedSince=tag)
  sync_tag VARCHAR(100) COMMENT 'Tag utilisé par Apple pour filtrer les passes mis à jour',
  
  FOREIGN KEY (pass_serial_number) REFERENCES wallet_cards(pass_serial_number) ON DELETE CASCADE,
  UNIQUE KEY uq_device_pass (pass_serial_number, device_library_identifier),
  INDEX idx_device_id (device_library_identifier),
  INDEX idx_push_token (push_token),
  INDEX idx_registered_at (registered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: pass_update_logs
-- Trace tout changement de points/tampons pour audit et replay
CREATE TABLE IF NOT EXISTS pass_update_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  wallet_card_id INT NOT NULL COMMENT 'Référence à la carte',
  pass_serial_number VARCHAR(100) NOT NULL COMMENT 'Identifiant du pass',
  
  action VARCHAR(50) NOT NULL COMMENT 'Type: add_points, add_stamps, redeem_reward, etc.',
  value INT COMMENT 'Nombre de points/tampons ajoutés/retirés',
  
  old_balance INT COMMENT 'Solde avant l\'action',
  new_balance INT COMMENT 'Solde après l\'action',
  
  description VARCHAR(255) COMMENT 'Détails de l\'action',
  triggered_by VARCHAR(100) COMMENT 'Qui a déclenché: qr_scan, admin, system, etc.',
  
  push_notification_sent BOOLEAN DEFAULT FALSE COMMENT 'Si une notification push a été envoyée',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (wallet_card_id) REFERENCES wallet_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (pass_serial_number) REFERENCES wallet_cards(pass_serial_number),
  INDEX idx_serial_number (pass_serial_number),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajouter les colonnes Apple Wallet à card_customization si elle existe
-- (Optional - comment out these lines if table doesn't exist)
-- ALTER TABLE card_customization ADD COLUMN IF NOT EXISTS apple_logo_url VARCHAR(255);
-- ALTER TABLE card_customization ADD COLUMN IF NOT EXISTS apple_icon_url VARCHAR(255);
