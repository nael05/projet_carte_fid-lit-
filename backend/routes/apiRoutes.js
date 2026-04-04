import express from 'express';
import * as apiController from '../controllers/apiController.js';
import * as loyaltyController from '../controllers/loyaltyController.js';
import { verifyToken, isAdmin, isPro } from '../middlewares/auth.js';

const router = express.Router();

// Master Admin Routes
router.post('/admin/login', apiController.adminLogin);
router.get('/admin/enterprises', verifyToken, isAdmin, apiController.getEnterprises);
router.post('/admin/create-company', verifyToken, isAdmin, apiController.createCompany);
router.put('/admin/suspend-company/:companyId', verifyToken, isAdmin, apiController.suspendCompany);
router.put('/admin/reactivate-company/:companyId', verifyToken, isAdmin, apiController.reactivateCompany);
router.delete('/admin/delete-company/:companyId', verifyToken, isAdmin, apiController.deleteCompany);

// Pro Routes
router.post('/pro/login', apiController.proLogin);
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

// Loyalty Configuration Routes
router.get('/pro/loyalty/config', verifyToken, isPro, loyaltyController.getLoyaltyConfig);
router.put('/pro/loyalty/config', verifyToken, isPro, loyaltyController.updateLoyaltyConfig);

// Stamps System Routes
router.post('/pro/stamps/add/:clientId', verifyToken, isPro, loyaltyController.addStamps);
router.post('/pro/stamps/claim/:clientId', verifyToken, isPro, loyaltyController.claimStampReward);

// Push Notifications Routes
router.post('/pro/notifications/send', verifyToken, isPro, loyaltyController.sendPushNotification);
router.get('/pro/notifications/history', verifyToken, isPro, loyaltyController.getPushNotificationHistory);
router.get('/pro/notifications/:notificationId', verifyToken, isPro, loyaltyController.getPushNotificationDetails);

// Loyalty Stats Routes
router.get('/pro/loyalty/stats', verifyToken, isPro, loyaltyController.getLoyaltyStats);

// Card Customization Routes
router.get('/pro/card-customization/:empresaId', verifyToken, isPro, apiController.getCardCustomization);
router.put('/pro/card-customization/:empresaId', verifyToken, isPro, apiController.updateCardCustomization);

// Public Client Routes
router.post('/join/:entrepriseId', apiController.registerClientAndGeneratePass);
router.get('/companies/:companyId/info', apiController.getCompanyInfo);

export default router;
