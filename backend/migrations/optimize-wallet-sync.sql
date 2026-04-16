-- Optimisation ULTIME de la table wallet_cards et registrations pour Apple Wallet
-- 1. Passage en haute précision pour les millisecondes
ALTER TABLE wallet_cards MODIFY COLUMN last_updated TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- 2. Ajout d'index de RECHERCHE RAPIDE (Critique pour Apple Wallet)
-- Sans ces index, le serveur fait un "Full Table Scan" à chaque requête d'iPhone
ALTER TABLE wallet_cards ADD INDEX idx_serial_lookup (pass_serial_number);
ALTER TABLE wallet_cards ADD INDEX idx_sync_lookup (client_id, company_id);

-- 3. Ajout d'index sur les enregistrements d'appareils
ALTER TABLE apple_pass_registrations ADD INDEX idx_device_id (device_library_identifier);
ALTER TABLE apple_pass_registrations ADD INDEX idx_reg_serial (pass_serial_number);
