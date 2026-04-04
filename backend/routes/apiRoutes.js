import express from 'express';
import * as apiController from '../controllers/apiController.js';
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

// Public Client Routes
router.post('/join/:entrepriseId', apiController.registerClientAndGeneratePass);
router.get('/companies/:companyId/info', apiController.getCompanyInfo);

export default router;
