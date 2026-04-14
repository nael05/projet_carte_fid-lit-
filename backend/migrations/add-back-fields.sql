ALTER TABLE card_customization ADD COLUMN back_fields_phone VARCHAR(20) AFTER back_fields_website;
ALTER TABLE card_customization ADD COLUMN back_fields_address VARCHAR(255) AFTER back_fields_phone;
ALTER TABLE card_customization ADD COLUMN back_fields_instagram VARCHAR(100) AFTER back_fields_address;
ALTER TABLE card_customization ADD COLUMN back_fields_facebook VARCHAR(100) AFTER back_fields_instagram;
ALTER TABLE card_customization ADD COLUMN back_fields_tiktok VARCHAR(100) AFTER back_fields_facebook;
