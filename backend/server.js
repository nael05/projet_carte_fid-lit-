import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/apiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import pool from './db.js';

const REQUIRED_ENV = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = REQUIRED_ENV.filter(k => process.env[k] === undefined);
if (missingEnv.length > 0) {
  console.error(`[FATAL] Variables d'environnement manquantes : ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// ===== SECURITY MIDDLEWARES =====
// Helmet config - désactiver hsts en développement local
app.use(helmet({
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000 } : false,
  contentSecurityPolicy: false, // Laisser CORS gérer
}));

// CORS configuré correctement (liste blanche)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'https://fidelyzapp.fr',
      'https://www.fidelyzapp.fr',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5173',
      'http://192.168.1.7:3000',
      'http://192.168.1.7:3001',
      'http://192.168.1.7:3002',
      'http://192.168.1.7:5000',
      'http://192.168.1.7:5173',
      /^http:\/\/192\.168\.\d+\.\d+:(300[0-9]|5[0-9]{3})$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:(300[0-9]|5[0-9]{3})$/
    ];

const ipRangeRegex = /^http:\/\/(192\.168|10)\.\d+\.\d+:(300[0-9]|5[0-9]{3})$/;

app.use(cors({
  origin: (origin, callback) => {
    // Requêtes sans origine (ex: Postman, appels server-to-server Apple Wallet)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    callback(new Error(`CORS: origine non autorisée — ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id'],
  maxAge: 86400,
}));

// ===== BODY PARSER =====
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ===== STATIC FILES =====
logger.info(`📁 Uploads directory: ${uploadsDir}`);
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir)); // Frontend compatibility

// ===== ROUTES =====
app.get('/api/wallet', (req, res) => {
  logger.info('🔍 [APPLE CONNECT] L\'iPhone a testé la racine du WebService');
  res.json({ status: 'active', service: 'Apple Wallet WebService' });
});

app.use('/api', apiRoutes);

// ===== HEALTH CHECK avec DB =====
app.get('/health', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1');
    res.json({ status: 'OK', database: 'connected' });
  } catch (err) {
    logger.error('Health check failed - DB connection issue', { error: err.message });
    res.status(503).json({ status: 'ERROR', database: 'disconnected', error: err.message });
  }
});

// ===== HEALTH CHECK & DIAGNOSTICS =====
app.get('/api/wallet/health', (req, res) => {
  try {
    // Test PassGenerator configuration
    import('./utils/passGenerator.js').then((module) => {
      const pg = module.passGenerator;
      pg.validateConfiguration();
    });

    // Test APNService configuration  
    import('./utils/apnService.js').then((module) => {
      const apn = module.apnService;
      logger.info('✅ Provider APNs prêt');
    });

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      configuration: {
        passGenerator: '✅ Validée',
        apnService: '✅ Prête'
      }
    });
  } catch (err) {
    logger.error('Health check error', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== 404 HANDLER =====
app.use(notFoundHandler);

// ===== ERROR HANDLER (doit être dernier) =====
app.use(errorHandler);

// ===== START SERVER =====
app.listen(PORT, () => {
  logger.info(`✅ Backend démarré sur http://localhost:${PORT}`);
  logger.info(`📍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  setTimeout(() => {
    try {
      import('./utils/passGenerator.js').then((module) => {
        if (module.default) module.default.validateConfiguration();
      });
      import('./utils/apnService.js').then((module) => {
        logger.info('✅ Configuration APNs initialisée');
      });
    } catch (err) {
      logger.warn('⚠️ Warning quelconque', err.message);
    }
  }, 100);
});
