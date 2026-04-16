-- Optimisation de la table wallet_cards pour la rapidité Apple Wallet
-- 1. Passage en haute précision pour les millisecondes (évite les conflits de synchro rapide)
ALTER TABLE wallet_cards MODIFY COLUMN last_updated TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- 2. Ajout d'index pour accélérer les lookups lors des scans
ALTER TABLE wallet_cards ADD INDEX idx_sync_lookup (client_id, company_id);

-- 3. Ajout d'index pour accélérer les recherches globales par entreprise
ALTER TABLE wallet_cards ADD INDEX idx_company_sync (company_id);
