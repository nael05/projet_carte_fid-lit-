-- Script de secours pour s'assurer que la colonne last_updated existe dans wallet_cards
-- A exécuter sur le serveur si les scans ne mettent pas à jour les cartes Apple.

ALTER TABLE wallet_cards ADD COLUMN IF NOT EXISTS last_updated DATETIME;
UPDATE wallet_cards SET last_updated = NOW() WHERE last_updated IS NULL;
