ALTER TABLE card_customization 
ADD COLUMN IF NOT EXISTS back_fields_phone VARCHAR(20) AFTER back_fields_website,
ADD COLUMN IF NOT EXISTS back_fields_address VARCHAR(255) AFTER back_fields_phone,
ADD COLUMN IF NOT EXISTS back_fields_instagram VARCHAR(100) AFTER back_fields_address,
ADD COLUMN IF NOT EXISTS back_fields_facebook VARCHAR(100) AFTER back_fields_instagram,
ADD COLUMN IF NOT EXISTS back_fields_tiktok VARCHAR(100) AFTER back_fields_facebook;
