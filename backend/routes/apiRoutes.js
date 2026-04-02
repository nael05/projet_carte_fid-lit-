const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const verifyToken = require('../middlewares/auth');

router.post('/auth/login', apiController.login);
router.get('/clients', verifyToken, apiController.getClients);
router.post('/clients/public/:entrepriseId', apiController.createClient);
router.post('/scan/add-points', verifyToken, apiController.addPoints);
router.get('/entreprise/branding/:entrepriseId', apiController.getBranding);
router.get('/pass/apple/:clientId', apiController.generateApplePass);

module.exports = router;