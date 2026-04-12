/**
 * WalletRoutes.js
 * Routes pour l'intégration Apple Wallet
 *
 * Deux groupes de routes:
 * 1. API Frontend: /app/wallet/* (authentification client)
 * 2. API Apple Web Service: /wallet/* (authentification Apple Wallet)
 */

import express from 'express';
import * as walletAppController from '../controllers/walletAppController.js';
import * as appleWebserviceController from '../controllers/appleWebserviceController.js';
import { verifyToken, isPro } from '../middlewares/auth.js';
import { passGenerator } from '../utils/passGenerator.js';
import db from '../db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Diagnostic middleware pour les routes Apple (debug 404)
router.use('/wallet/v1/*', (req, res, next) => {
  logger.info(`🔍 [APPLE WALLET REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================================================
// GROUPE 1: API FRONTEND (utilisée par notre application)
// Prefix: /app/wallet
// Authentification: JWT Token (client/pro)
// ============================================================================

/**
 * POST /api/app/wallet/create
 * Crée un nouveau pass Apple Wallet pour un client
 * Auth: JWT Token (Pro)
 *
 * Body: { clientId }
 * Response: .pkpass file (binary)
 */
router.post('/app/wallet/create', verifyToken, isPro, walletAppController.createWalletPass);

/**
 * GET /api/app/wallet/client-download/:clientId
 * URL publique permettant le téléchargement natif du Wallet Pass par un client après inscription.
 */
router.get('/app/wallet/client-download/:clientId', walletAppController.downloadClientPass);

/**
 * POST /api/app/wallet/add-points
 * Ajoute des points/tampons à la carte d'un client
 * Auth: JWT Token (Pro/Admin)
 *
 * Body: { clientId, pointsToAdd, reason }
 * Response: { success, oldBalance, newBalance, notificationsSent }
 */
router.post('/app/wallet/add-points', verifyToken, isPro, walletAppController.addPointsToWallet);

/**
 * GET /api/app/wallet/status/:clientId
 * Récupère le statut de la carte Apple Wallet d'un client
 * Auth: JWT Token (Pro)
 *
 * Response: { balance, devicesRegistered, lastUpdated, ... }
 */
router.get('/app/wallet/status/:clientId', verifyToken, isPro, walletAppController.getWalletStatus);

// ============================================================================
// GROUPE 2: API APPLE WEB SERVICE (utilisée par Apple Wallet)
// Prefix: /wallet (pas de /app)
// Authentification: Token Apple (Authorization: ApplePass <token>)
// ============================================================================

/**
 * POST /api/wallet/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber
 * Apple Wallet enregistre un appareil
 *
 * Auth: ApplePass token (header Authorization)
 * Body: { pushToken }
 * Response: 201 (Created) ou 200 (OK)
 */
router.post(
  '/wallet/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
  appleWebserviceController.registerDevice
);

/**
 * GET /api/wallet/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier
 * Apple Wallet vérifie quels passes ont changé
 *
 * Query: passesUpdatedSince=<timestamp>
 * Response: 204 (rien) ou 200 { serialNumbers: [...], lastUpdated: ... }
 */
router.get(
  '/wallet/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier',
  appleWebserviceController.getUpdatedPasses
);

/**
 * GET /api/wallet/v1/passes/:passTypeIdentifier/:serialNumber
 * Apple Wallet télécharge le pass mis à jour
 *
 * Auth: ApplePass token (header Authorization)
 * Response: .pkpass file (binary) + Last-Modified header
 */
router.get(
  '/wallet/v1/passes/:passTypeIdentifier/:serialNumber',
  appleWebserviceController.authenticateApplePass,
  appleWebserviceController.getUpdatedPass
);

/**
 * DELETE /api/wallet/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber
 * Apple Wallet supprime un enregistrement (client a supprimé le pass de son Wallet)
 *
 * Auth: ApplePass token (header Authorization)
 * Response: 200
 */
router.delete(
  '/wallet/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
  appleWebserviceController.authenticateApplePass,
  appleWebserviceController.unregisterDevice
);

/**
 * POST /api/wallet/v1/log
 * Apple Wallet envoie des logs pour debug
 *
 * Body: { logs: ["error 1", ...] }
 * Response: 200
 */
router.post('/wallet/v1/log', appleWebserviceController.logAppleWalletErrors);

// ============================================================================
// ROUTES ADMIN (OPTIONNEL)
// ============================================================================

/**
 * GET /api/app/wallet/admin/cards/:companyId
 * Liste toutes les cartes créées pour une entreprise
 * Auth: JWT Token (Admin)
 */
router.get('/app/wallet/admin/cards/:companyId', verifyToken, async (req, res) => {
  try {
    const { companyId } = req.params;

    const [cards] = await db.query(
      `SELECT wc.id, wc.pass_serial_number, c.prenom, c.nom,
              wc.points_balance, wc.stamps_balance, wc.wallet_added_at,
              COUNT(apr.id) as device_count
       FROM wallet_cards wc
       JOIN clients c ON wc.client_id = c.id
       LEFT JOIN apple_pass_registrations apr ON wc.pass_serial_number = apr.pass_serial_number
       WHERE wc.company_id = ?
       GROUP BY wc.id`,
      [companyId]
    );

    res.json({ success: true, cards });
  } catch (error) {
    logger.error(`Erreur fetch admin cards: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/app/wallet/test-download
 * TEMPORAIRE: Route non-authentifiée pour tester directement sur un iPhone
 */
router.get('/app/wallet/test-download', async (req, res) => {
  try {
    const dummyClient = {
       clientId: 'test-123',
       firstName: 'Test',
       lastName: 'Client',
       loyaltyType: 'stamps',
       balance: 3,
       stampMaxCount: 10,
       qrCodeValue: 'TEST-12345',
       createdAt: new Date().toISOString()
    };
    const dummyCustomization = {
       apple_pass_description: 'Test Pass',
       apple_organization_name: 'fidelyz test'
    };

    const passBuffer = await passGenerator.generateLoyaltyPass(dummyClient, dummyCustomization, 'TEST-123', 'fake-token-123456789');

    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': 'attachment; filename="test.pkpass"'
    });
    res.send(passBuffer);
  } catch (err) {
    res.status(500).send("Erreur: " + err.message);
  }
});

export default router;
