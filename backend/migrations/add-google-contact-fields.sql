ALTER TABLE card_customization ADD COLUMN google_back_phone VARCHAR(20) AFTER google_card_subtitle;
ALTER TABLE card_customization ADD COLUMN google_back_website VARCHAR(255) AFTER google_back_phone;
ALTER TABLE card_customization ADD COLUMN google_back_address VARCHAR(255) AFTER google_back_website;
ALTER TABLE card_customization ADD COLUMN google_back_instagram VARCHAR(100) AFTER google_back_address;
ALTER TABLE card_customization ADD COLUMN google_back_facebook VARCHAR(100) AFTER google_back_instagram;
ALTER TABLE card_customization ADD COLUMN google_back_tiktok VARCHAR(100) AFTER google_back_facebook;
ALTER TABLE card_customization ADD COLUMN google_offer_text TEXT AFTER google_back_tiktok;
