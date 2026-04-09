import express from 'express';
import * as apiController from '../controllers/apiController.js';
import * as loyaltyController from '../controllers/loyaltyController.js';
import * as migrationController from '../controllers/migrationController.js';
import walletRoutes from './walletRoutes.js';
import { verifyToken, isAdmin, isPro } from '../middlewares/auth.js';
import { loginLimiter, apiLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// ===== GLOBAL RATE LIMITER =====
router.use(apiLimiter);

// ===== Master Admin Routes =====
router.post('/admin/login', loginLimiter, apiController.adminLogin);
// Endpoint public pour migration (temporaire - à sécuriser ou supprimer après)
router.post('/setup/run-migration', migrationController.runMigrations);
router.post('/admin/migrations/run', verifyToken, isAdmin, migrationController.runMigrations);
router.get('/admin/enterprises', verifyToken, isAdmin, apiController.getEnterprises);
router.post('/admin/create-company', verifyToken, isAdmin, apiController.createCompany);
router.put('/admin/suspend-company/:companyId', verifyToken, isAdmin, apiController.suspendCompany);
router.put('/admin/reactivate-company/:companyId', verifyToken, isAdmin, apiController.reactivateCompany);
router.delete('/admin/delete-company/:companyId', verifyToken, isAdmin, apiController.deleteCompany);

// ===== Pro Routes =====
router.post('/pro/login', loginLimiter, apiController.proLogin);
router.get('/pro/status', verifyToken, isPro, apiController.getProStatus);
router.get('/pro/sessions', verifyToken, isPro, apiController.getProSessions);
router.post('/pro/logout-device', verifyToken, isPro, apiController.logoutProDevice);
router.post('/pro/logout-all', verifyToken, isPro, apiController.logoutProAll);
router.put('/pro/change-password', verifyToken, isPro, apiController.changePassword);
router.get('/pro/clients', verifyToken, isPro, apiController.getClients);
router.post('/pro/scan', verifyToken, isPro, apiController.handleScan);
router.put('/pro/adjust-points/:clientId', verifyToken, isPro, apiController.adjustPoints);
router.put('/pro/update-reward', verifyToken, isPro, apiController.updateReward);
router.get('/pro/info', verifyToken, isPro, apiController.getProInfo);

// ===== Loyalty Configuration Routes =====
router.get('/pro/loyalty/config', verifyToken, isPro, loyaltyController.getLoyaltyConfig);
router.put('/pro/loyalty/config', verifyToken, isPro, loyaltyController.updateLoyaltyConfig);

// ===== Stamps System Routes =====
router.post('/pro/stamps/add/:clientId', verifyToken, isPro, loyaltyController.addStamps);
router.post('/pro/stamps/claim/:clientId', verifyToken, isPro, loyaltyController.claimStampReward);

// ===== Push Notifications Routes =====
router.post('/pro/notifications/send', verifyToken, isPro, loyaltyController.sendPushNotification);
router.get('/pro/notifications/history', verifyToken, isPro, loyaltyController.getPushNotificationHistory);
router.get('/pro/notifications/:notificationId', verifyToken, isPro, loyaltyController.getPushNotificationDetails);

// ===== Loyalty Stats Routes =====
router.get('/pro/loyalty/stats', verifyToken, isPro, loyaltyController.getLoyaltyStats);

// ===== Card Customization Routes =====
router.get('/pro/card-customization/:empresaId', verifyToken, isPro, apiController.getCardCustomization);
router.put('/pro/card-customization/:empresaId', verifyToken, isPro, apiController.updateCardCustomization);

// ===== APPLE WALLET ROUTES =====
// Import et utilisation des routes Apple Wallet (contient les endpoints frontend + Apple Web Service)
// Frontend: /api/app/wallet /*
// Apple Web Service: /api/wallet/v1/*
router.use('/', walletRoutes);

// ===== Public Client Routes =====
router.get('/public/enterprises', apiController.getPublicEnterprises);
router.get('/companies/:companyId/info', apiController.getCompanyInfo);
router.get('/companies/:companyId/card-customization', apiController.getCardCustomization);
router.post('/join/:entrepriseId', apiController.registerClientAndGeneratePass);

export default router;
