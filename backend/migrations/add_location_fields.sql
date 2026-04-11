-- Ajout des champs pour la géolocalisation Apple Wallet
ALTER TABLE card_customization 
ADD COLUMN latitude DECIMAL(10, 8) NULL AFTER apple_pass_description,
ADD COLUMN longitude DECIMAL(11, 8) NULL AFTER latitude,
ADD COLUMN relevant_text VARCHAR(100) NULL AFTER longitude;
