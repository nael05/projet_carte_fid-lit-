-- Migration RGPD : ajout du consentement marketing (opt-in) sur la table clients
-- Exécuter via : POST /api/admin/migrations/run ou /api/setup/run-migration

ALTER TABLE `clients`
  ADD COLUMN IF NOT EXISTS `marketing_optin` BOOLEAN NOT NULL DEFAULT FALSE
    COMMENT 'Consentement RGPD : acceptation de recevoir des offres promotionnelles';
