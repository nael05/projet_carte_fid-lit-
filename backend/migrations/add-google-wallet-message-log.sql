CREATE TABLE IF NOT EXISTS google_wallet_message_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  object_id VARCHAR(255) NOT NULL,
  sent_at BIGINT UNSIGNED NOT NULL,
  INDEX idx_object_sent (object_id, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
