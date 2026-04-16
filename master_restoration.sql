DROP DATABASE IF EXISTS loyalty_saas;
CREATE DATABASE loyalty_saas;
USE loyalty_saas;

CREATE TABLE entreprises (
    id VARCHAR(36) PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    prenom VARCHAR(255),
    telephone VARCHAR(20),
    mot_de_passe VARCHAR(255) NOT NULL,
    temporary_password VARCHAR(255),
    must_change_password BOOLEAN DEFAULT FALSE,
    statut ENUM('actif', 'suspendu') DEFAULT 'actif',
    loyalty_type ENUM('points', 'stamps') DEFAULT 'points',
    last_login TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE loyalty_config (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    points_for_reward INT DEFAULT 100,
    stamps_for_reward INT DEFAULT 10,
    reward_title VARCHAR(255),
    reward_description TEXT,
    points_per_purchase INT DEFAULT 10,
    points_adding_mode ENUM('manual', 'automatic') DEFAULT 'manual',
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE card_customization (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    primary_color VARCHAR(20) DEFAULT '#3b82f6',
    text_color VARCHAR(20) DEFAULT '#ffffff',
    accent_color VARCHAR(20) DEFAULT '#60a5fa',
    card_subtitle VARCHAR(255) DEFAULT 'Carte de Fidélité',
    logo_url VARCHAR(255),
    icon_url VARCHAR(255),
    strip_image_url VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE clients (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    email VARCHAR(255),
    points INT DEFAULT 0,
    type_wallet ENUM('apple', 'google', 'none') DEFAULT 'none',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sessions (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(255),
    device_name VARCHAR(255),
    token_hash VARCHAR(255),
    session_version INT DEFAULT 1,
    expires_at DATETIME,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE transaction_history (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    entreprise_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    points_change INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reward_tiers (
    id VARCHAR(36) PRIMARY KEY,
    entreprise_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    points_required INT NOT NULL,
    description TEXT,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE wallet_cards (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    company_id VARCHAR(36) NOT NULL,
    pass_serial_number VARCHAR(255) NOT NULL UNIQUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE apple_pass_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_library_identifier VARCHAR(255) NOT NULL,
    push_token VARCHAR(255) NOT NULL,
    pass_type_identifier VARCHAR(255) NOT NULL,
    pass_serial_number VARCHAR(255) NOT NULL,
    UNIQUE KEY (device_library_identifier, pass_serial_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'superadmin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO admins (username, password) VALUES ('admin', '$2b$10$f6B0rO7U6uI6k6jJvN.5.OE5ZJv7W.zZ6Xz6lA9jA9J9J9J9J9J9J');
