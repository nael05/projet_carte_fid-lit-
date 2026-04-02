CREATE DATABASE IF NOT EXISTS fidelite_saas;
USE fidelite_saas;

CREATE TABLE entreprises (
    id CHAR(36) PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE,
    couleur_principale VARCHAR(7) DEFAULT '#000000',
    url_logo VARCHAR(255),
    cle_secrete_api VARCHAR(64) UNIQUE NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE utilisateurs (
    id CHAR(36) PRIMARY KEY,
    entreprise_id CHAR(36) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employe') DEFAULT 'employe',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
);

CREATE TABLE clients_finaux (
    id CHAR(36) PRIMARY KEY,
    entreprise_id CHAR(36) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    solde_points INT DEFAULT 0,
    pass_id VARCHAR(255) UNIQUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    UNIQUE(entreprise_id, email)
);

CREATE TABLE scans_historique (
    id CHAR(36) PRIMARY KEY,
    entreprise_id CHAR(36) NOT NULL,
    client_final_id CHAR(36) NOT NULL,
    utilisateur_id CHAR(36) NOT NULL,
    points_ajoutes INT NOT NULL,
    date_scan TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    FOREIGN KEY (client_final_id) REFERENCES clients_finaux(id) ON DELETE CASCADE,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
);