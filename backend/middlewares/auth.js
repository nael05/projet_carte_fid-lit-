import jwt from 'jsonwebtoken';
import { verifySessionValidity } from '../utils/sessionManager.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_in_production';

export const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '24h' });
};

// Wrapper pour middlewares async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Pour les Pro: vérifier la session de l'appareil
    if (decoded.role === 'pro') {
      const deviceId = req.headers['x-device-id'];
      
      if (deviceId) {
        // Si un deviceId est fourni, vérifier la session
        const sessionValid = await verifySessionValidity(decoded.id, deviceId);
        if (!sessionValid) {
          logger.debug('Session expired but JWT valid', { role: 'pro' });
        }
        // Stocker le deviceId pour les logs
        req.user.deviceId = deviceId;
      }
    }
    
    next();
  } catch (err) {
    logger.warn('Invalid token attempt', { error: err.message });
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
});

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    logger.warn('Unauthorized admin access attempt', { userId: req.user?.id });
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

export const isPro = (req, res, next) => {
  if (req.user.role !== 'pro') {
    logger.warn('Unauthorized pro access attempt', { userId: req.user?.id });
    return res.status(403).json({ error: 'Accès réservé aux professionnels' });
  }
  next();
};
