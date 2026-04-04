-- Migration: Add Google Wallet Customization Fields
-- Date: 2026-04-04
-- Description: Allows per-loyalty-type Google Wallet customization

ALTER TABLE card_customization ADD COLUMN (
  wallet_class_id VARCHAR(255) DEFAULT NULL COMMENT 'Google Wallet Class ID',
  wallet_card_title VARCHAR(255) DEFAULT NULL COMMENT 'Title displayed on card',
  wallet_header_text VARCHAR(255) DEFAULT NULL COMMENT 'Header text on card',
  wallet_subtitle_text VARCHAR(500) DEFAULT NULL COMMENT 'Subtitle/description on card',
  wallet_barcode_text_template VARCHAR(255) DEFAULT NULL COMMENT 'Template for barcode alternate text',
  wallet_description_text VARCHAR(500) DEFAULT NULL COMMENT 'Description text for wallet pass'
);

-- Index for faster queries
ALTER TABLE card_customization ADD INDEX idx_wallet_class (wallet_class_id);

-- Example: Set defaults for existing entries (optional)
-- UPDATE card_customization SET 
--   wallet_card_title = 'Carte de Fidélité',
--   wallet_header_text = 'Accumulez vos points',
--   wallet_subtitle_text = 'Profitez des récompenses',
--   wallet_barcode_text_template = 'Client ID: {clientId}'
-- WHERE wallet_card_title IS NULL;
