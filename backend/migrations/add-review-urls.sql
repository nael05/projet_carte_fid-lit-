-- Migration : ajout des liens d'avis Google indépendants par type de carte
-- Apple Wallet et Google Wallet ont chacun leur propre URL (totalement indépendants)

ALTER TABLE `card_customization`
  ADD COLUMN IF NOT EXISTS `apple_review_url` TEXT DEFAULT NULL
    COMMENT 'Lien avis Google affiché au dos de la carte Apple Wallet',
  ADD COLUMN IF NOT EXISTS `google_review_url` TEXT DEFAULT NULL
    COMMENT 'Lien avis Google affiché au dos de la carte Google Wallet';
