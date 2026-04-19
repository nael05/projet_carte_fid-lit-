import multer from 'multer';
import path from 'path';
import express from 'express';
import * as apiController from '../controllers/apiController.js';
import * as loyaltyController from '../controllers/loyaltyController.js';
import * as migrationController from '../controllers/migrationController.js';
import * as pushController from '../controllers/pushController.js';
import walletRoutes from './walletRoutes.js';
import { verifyToken, isAdmin, isPro } from '../middlewares/auth.js';
import { loginLimiter, apiLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.user?.id + '-' + Date.now() + ext)
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'));
  }
});

// ===== GLOBAL RATE LIMITER =====
router.use(apiLimiter);

// ===== Master Admin Routes =====
router.post('/admin/login', loginLimiter, apiController.adminLogin);
// Endpoint public pour migration (temporaire - à sécuriser ou supprimer après)
router.get('/setup/run-migration', migrationController.runMigrations);
router.post('/setup/run-migration', migrationController.runMigrations);
router.post('/admin/migrations/run', verifyToken, isAdmin, migrationController.runMigrations);
router.get('/admin/enterprises', verifyToken, isAdmin, apiController.getEnterprises);
router.post('/admin/create-company', verifyToken, isAdmin, apiController.createCompany);
router.put('/admin/suspend-company/:companyId', verifyToken, isAdmin, apiController.suspendCompany);
router.put('/admin/reactivate-company/:companyId', verifyToken, isAdmin, apiController.reactivateCompany);
router.delete('/admin/delete-company/:companyId', verifyToken, isAdmin, apiController.deleteCompany);
router.put('/admin/update-company/:companyId', verifyToken, isAdmin, apiController.updateCompany);

// ===== Pro Routes =====
router.post('/pro/login', loginLimiter, apiController.proLogin);
router.get('/pro/status', verifyToken, isPro, apiController.getProStatus);
router.get('/pro/sessions', verifyToken, isPro, apiController.getProSessions);
router.post('/pro/logout-device', verifyToken, isPro, apiController.logoutProDevice);
router.post('/pro/logout-all', verifyToken, isPro, apiController.logoutProAll);
router.put('/pro/change-password', verifyToken, isPro, apiController.changePassword);
router.post('/pro/forgot-password', apiController.forgotPassword);
router.post('/pro/reset-password', apiController.resetPassword);
router.get('/pro/clients', verifyToken, isPro, apiController.getClients);
router.post('/pro/scan', verifyToken, isPro, apiController.handleScan);
router.get('/pro/scan-lookup/:clientId', verifyToken, isPro, apiController.getScanInfo);
router.post('/pro/scan/finalize', verifyToken, isPro, apiController.finalizeFullTransaction);
router.put('/pro/adjust-points/:clientId', verifyToken, isPro, apiController.adjustPoints);

router.get('/pro/info', verifyToken, isPro, apiController.getProInfo);
router.delete('/pro/clients/:clientId', verifyToken, isPro, apiController.deleteClient);

// ===== Loyalty Configuration Routes =====
router.get('/pro/loyalty/config', verifyToken, isPro, loyaltyController.getLoyaltyConfig);
router.put('/pro/loyalty/config', verifyToken, isPro, loyaltyController.updateLoyaltyConfig);

// ===== Reward Tiers Routes =====
router.get('/pro/reward-tiers', verifyToken, isPro, loyaltyController.getRewardTiers);
router.post('/pro/reward-tiers', verifyToken, isPro, loyaltyController.createRewardTier);
router.put('/pro/reward-tiers/:id', verifyToken, isPro, loyaltyController.updateRewardTier);
router.delete('/pro/reward-tiers/:id', verifyToken, isPro, loyaltyController.deleteRewardTier);
router.post('/pro/redeem-reward', verifyToken, isPro, apiController.redeemReward);

// ===== Push Notifications Routes =====
router.post('/pro/notifications/send', verifyToken, isPro, loyaltyController.sendPushNotification);
router.get('/pro/notifications/history', verifyToken, isPro, loyaltyController.getPushNotificationHistory);
router.get('/pro/notifications/:notificationId', verifyToken, isPro, loyaltyController.getPushNotificationDetails);

// ===== Loyalty Stats Routes =====
router.get('/pro/loyalty/stats', verifyToken, isPro, loyaltyController.getLoyaltyStats);

// ===== Card Customization Routes =====
router.get('/pro/card-customization/:empresaId', verifyToken, isPro, apiController.getCardCustomization);
router.put('/pro/card-customization/:empresaId', verifyToken, isPro, apiController.updateCardCustomization);
router.post('/pro/upload-logo', verifyToken, isPro, upload.single('logo'), apiController.uploadLogo);

// ===== PUSH NOTIFICATION ROUTES =====
router.post('/pro/push/send', verifyToken, isPro, pushController.sendNotification);
router.get('/pro/push/history', verifyToken, isPro, pushController.getHistory);

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
