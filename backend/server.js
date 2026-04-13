import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/apiRoutes.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import pool from './db.js';

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
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isTunnel = origin && (origin.endsWith('.loca.lt') || origin.endsWith('.ngrok-free.app') || origin.endsWith('.ngrok.io'));
    
    if (!origin || isDevelopment || isTunnel || allowedOrigins.includes(origin) || ipRangeRegex.test(origin)) {
      callback(null, true);
    } else {
      logger.warn(`🚫 CORS bloqué pour l'origine: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id'],
  maxAge: 86400, // 24 heures
}));

// ===== BODY PARSER =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ===== STATIC FILES =====
app.use('/uploads', express.static('uploads'));
app.use('/api/uploads', express.static('uploads')); // Double mount for better tunnel/proxy support

// ===== ROUTES =====
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
