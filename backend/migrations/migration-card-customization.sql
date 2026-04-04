-- Table pour stocker les paramètres de personnalisation des cartes de fidélité
-- SÉPARÉ PAR TYPE DE LOYAUTÉ (points vs tampons)
CREATE TABLE IF NOT EXISTS card_customization (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL,
  loyalty_type ENUM('points', 'stamps') NOT NULL,
  card_background_color VARCHAR(7) DEFAULT '#1f2937',
  card_text_color VARCHAR(7) DEFAULT '#ffffff',
  card_accent_color VARCHAR(7) DEFAULT '#3b82f6',
  card_border_radius INT DEFAULT 12,
  card_logo_url LONGTEXT,
  card_pattern VARCHAR(50) DEFAULT 'solid',
  font_family VARCHAR(100) DEFAULT 'Arial',
  show_company_name BOOLEAN DEFAULT true,
  show_loyalty_type BOOLEAN DEFAULT true,
  custom_message TEXT,
  card_design_template VARCHAR(50) DEFAULT 'classic',
  gradient_start VARCHAR(7),
  gradient_end VARCHAR(7),
  background_image_url LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_company_loyalty (company_id, loyalty_type),
  INDEX idx_company (company_id),
  INDEX idx_loyalty_type (loyalty_type)
);

-- Ajouter les colonnes de référence au style de carte dans la table cards si nécessaire
ALTER TABLE cards ADD COLUMN card_style_version INT DEFAULT 1 AFTER type_wallet;
