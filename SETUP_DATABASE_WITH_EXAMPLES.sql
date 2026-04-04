-- =========================================================================
-- SETUP_DATABASE_WITH_EXAMPLES.sql
-- =========================================================================
-- Fichier SQL complet avec données d'exemple pour tester
-- À utiliser APRÈS avoir exécuté SETUP_DATABASE.sql
-- =========================================================================

USE loyalty_saas;

-- =========================================================================
-- NETTOYAGE (optionnel - décommenter si vous refaites le setup)
-- =========================================================================
-- DROP TABLE IF EXISTS push_notifications_sent;
-- DROP TABLE IF EXISTS transaction_history;
-- DROP TABLE IF EXISTS card_customization;
-- DROP TABLE IF EXISTS customer_stamps;
-- DROP TABLE IF EXISTS loyalty_config;
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS clients;
-- DROP TABLE IF EXISTS entreprises;
-- DROP TABLE IF EXISTS super_admins;

-- =========================================================================
-- 1. SUPER ADMIN
-- =========================================================================

-- Insérer le Master Admin (si pas déjà présent)
INSERT IGNORE INTO super_admins (id, identifiant, mot_de_passe) 
VALUES (
  UUID(),
  'master_admin',
  '$2b$10$Bv2X9D.F8Z/8E2QF5q0h2eP1Y7T9V6Z3K5L4M1N2O3P4Q5R6S7T8U'
);

-- =========================================================================
-- 2. ENTREPRISES D'EXEMPLE
-- =========================================================================

-- Exemple 1: Entreprise Points
INSERT INTO entreprises (
  id, nom, email, mot_de_passe, statut, loyalty_type, 
  recompense_definition, must_change_password
) VALUES (
  'entreprise-001',
  'Café Premium',
  'cafe@example.com',
  '$2b$10$Bv2X9D.F8Z/8E2QF5q0h2eP1Y7T9V6Z3K5L4M1N2O3P4Q5R6S7T8U',
  'actif',
  'points',
  'Un café gratuit après 10 points accumulés !',
  FALSE
);

-- Exemple 2: Entreprise Tampons
INSERT INTO entreprises (
  id, nom, email, mot_de_passe, statut, loyalty_type,
  recompense_definition, must_change_password
) VALUES (
  'entreprise-002',
  'Boulangerie du Coin',
  'boulangerie@example.com',
  '$2b$10$Bv2X9D.F8Z/8E2QF5q0h2eP1Y7T9V6Z3K5L4M1N2O3P4Q5R6S7T8U',
  'actif',
  'stamps',
  'Une baguette gratuite à chaque 10 tampons !',
  FALSE
);

-- =========================================================================
-- 3. CONFIGURATIONS DE FIDÉLITÉ
-- =========================================================================

-- Config pour Café Premium (Points)
INSERT INTO loyalty_config (
  id, entreprise_id, loyalty_type, points_per_purchase, points_for_reward,
  reward_title, reward_description,
  push_notifications_enabled
) VALUES (
  'config-001',
  'entreprise-001',
  'points',
  1,
  10,
  'Café Gratuit',
  'Vous avez gagné un café gratuit ! Profitez-en lors de votre prochaine visite.',
  TRUE
);

-- Config pour Boulangerie (Tampons)
INSERT INTO loyalty_config (
  id, entreprise_id, loyalty_type, stamps_count, stamps_per_purchase,
  stamps_for_reward, reward_title, reward_description,
  push_notifications_enabled
) VALUES (
  'config-002',
  'entreprise-002',
  'stamps',
  10,
  1,
  10,
  'Baguette Gratuite',
  'Vous avez rempli tous vos tampons ! Une baguette gratuite vous attend.',
  TRUE
);

-- =========================================================================
-- 4. CLIENTS D'EXEMPLE
-- =========================================================================

-- Clients du Café Premium
INSERT INTO clients (
  id, entreprise_id, nom, prenom, telephone, points, type_wallet
) VALUES
  ('client-001', 'entreprise-001', 'Dupont', 'Jean', '0612345678', 5, 'apple'),
  ('client-002', 'entreprise-001', 'Martin', 'Marie', '0687654321', 8, 'google'),
  ('client-003', 'entreprise-001', 'Durand', 'Pierre', '0698765432', 10, 'apple'),
  ('client-004', 'entreprise-001', 'Leblanc', 'Sophie', '0612341234', 3, 'google');

-- Clients de la Boulangerie
INSERT INTO clients (
  id, entreprise_id, nom, prenom, telephone, points, type_wallet
) VALUES
  ('client-005', 'entreprise-002', 'Rousseau', 'Luc', '0645678901', 0, 'apple'),
  ('client-006', 'entreprise-002', 'Lefebvre', 'Anna', '0634567890', 0, 'google'),
  ('client-007', 'entreprise-002', 'Garnier', 'Thomas', '0623456789', 0, 'apple');

-- =========================================================================
-- 5. TAMPONS POUR BOULANGERIE
-- =========================================================================

-- Initialiser les tampons pour les clients de la boulangerie
INSERT INTO customer_stamps (
  id, client_id, entreprise_id, stamps_collected, stamps_redeemed
) VALUES
  ('stamps-001', 'client-005', 'entreprise-002', 0, 0),
  ('stamps-002', 'client-006', 'entreprise-002', 0, 0),
  ('stamps-003', 'client-007', 'entreprise-002', 5, 0);

-- =========================================================================
-- 6. PERSONNALISATIONS DE CARTES
-- =========================================================================

-- Personnalisation Café Premium
INSERT INTO card_customization (
  id, company_id, loyalty_type, primary_color, secondary_color,
  accent_color, text_color, card_title, card_subtitle, footer_text,
  show_qr_code, show_barcode, show_progress_bar,
  apple_wallet_enabled, google_wallet_enabled
) VALUES (
  'custom-001',
  'entreprise-001',
  'points',
  '#8B4513',
  '#654321',
  '#D2B48C',
  '#FFFFFF',
  'Café Premium',
  'Votre carte de fidélité',
  'www.cafe-premium.fr',
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE
);

-- Personnalisation Boulangerie
INSERT INTO card_customization (
  id, company_id, loyalty_type, primary_color, secondary_color,
  accent_color, text_color, card_title, card_subtitle, footer_text,
  show_qr_code, show_barcode, show_progress_bar,
  apple_wallet_enabled, google_wallet_enabled
) VALUES (
  'custom-002',
  'entreprise-002',
  'stamps',
  '#F5DEB3',
  '#DEB887',
  '#D2B48C',
  '#333333',
  'Boulangerie du Coin',
  'Votre carte de fidélité',
  'www.boulangerie-coin.fr',
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE
);

-- =========================================================================
-- 7. HISTORIQUE DE TRANSACTIONS
-- =========================================================================

-- Transactions Café Premium
INSERT INTO transaction_history (
  id, client_id, entreprise_id, type, points_change, description
) VALUES
  ('trans-001', 'client-001', 'entreprise-001', 'add_points', 5, 'Achat client #1'),
  ('trans-002', 'client-002', 'entreprise-001', 'add_points', 8, 'Achat client #2'),
  ('trans-003', 'client-003', 'entreprise-001', 'add_points', 10, 'Achat client #3'),
  ('trans-004', 'client-003', 'entreprise-001', 'reward_unlocked', 0, 'Récompense déverrouillée !'),
  ('trans-005', 'client-004', 'entreprise-001', 'add_points', 3, 'Achat client #4');

-- Transactions Boulangerie
INSERT INTO transaction_history (
  id, client_id, entreprise_id, type, stamps_change, description
) VALUES
  ('trans-006', 'client-007', 'entreprise-002', 'add_stamps', 5, 'Achat de tampons'),
  ('trans-007', 'client-005', 'entreprise-002', 'add_stamps', 1, 'Achat client #1'),
  ('trans-008', 'client-006', 'entreprise-002', 'add_stamps', 1, 'Achat client #1');

-- =========================================================================
-- 8. VÉRIFICATION DES DONNÉES
-- =========================================================================

-- Voir l'état global
SELECT 'Super Admins' as 'Section', COUNT(*) as 'Total' FROM super_admins
UNION ALL
SELECT 'Entreprises', COUNT(*) FROM entreprises
UNION ALL
SELECT 'Clients', COUNT(*) FROM clients
UNION ALL
SELECT 'Configs Fidélité', COUNT(*) FROM loyalty_config
UNION ALL
SELECT 'Personnalisations', COUNT(*) FROM card_customization
UNION ALL
SELECT 'Transactions', COUNT(*) FROM transaction_history
UNION ALL
SELECT 'Tampons Clients', COUNT(*) FROM customer_stamps;

-- Voir les détails des entreprises
SELECT id, nom, email, statut, loyalty_type FROM entreprises;

-- Voir les clients avec leurs points
SELECT c.id, c.prenom, c.nom, c.points, c.type_wallet, e.nom as entreprise
FROM clients c
LEFT JOIN entreprises e ON c.entreprise_id = e.id
ORDER BY e.nom;

-- =========================================================================
-- 9. INFORMATIONS DE CONNEXION POUR TEST
-- =========================================================================
/*
MASTER ADMIN:
  Identifiant: master_admin
  Password: master123
  Url: http://localhost:3000/master-admin-secret

ENTREPRISME 1 (Café Premium):
  Email: cafe@example.com
  Password: master123
  Url: http://localhost:3000/pro/login

ENTREPRISME 2 (Boulangerie):
  Email: boulangerie@example.com
  Password: master123
  Url: http://localhost:3000/pro/login

CLIENT (Public):
  Url: http://localhost:3000/join/{entreprise_id}
  Utiliser l'ID: entreprise-001 ou entreprise-002
*/

-- =========================================================================
-- 10. NOTES POUR LE DÉVELOPPEMENT
-- =========================================================================
/*
1. Les mots de passe hashés ($2b$10$...) doivent être générés avec bcrypt
   Password utilisé: "master123"

2. Remplacer les UUID par des UUID uniques en production
   En backend, utiliser: import { v4 as uuidv4 } from 'uuid'

3. Les email doivent être uniques dans la table entreprises

4. Chaque client doit avoir:
   - Un UUID unique (id)
   - Une référence à une entreprise (entreprise_id)
   - Un wallet type (apple ou google)

5. Chaque entreprise doit avoir:
   - Une configuration de fidélité (loyalty_config)
   - Une personnalisation de carte (card_customization)

6. Les transactions sont trackées automatiquement par l'API

7. Les sessions expirent automatiquement après 24h

8. Pour modifier un mot de passe, utiliser bcrypt:
   const hashedPassword = await bcrypt.hash('nouveau_password', 10);

9. Les contraintes de clés étrangères garantissent l'intégrité des données

10. Les index sont optimisés pour les requêtes courantes
*/

-- =========================================================================
-- FIN DU SCRIPT
-- =========================================================================
