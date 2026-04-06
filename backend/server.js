import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/apiRoutes.js';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===== SECURITY MIDDLEWARES =====
app.use(helmet());

// CORS configuré correctement (liste blanche)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

// ===== 404 HANDLER =====
app.use(notFoundHandler);

// ===== ERROR HANDLER (doit être dernier) =====
app.use(errorHandler);

// ===== START SERVER =====
app.listen(PORT, () => {
  logger.info(`✅ Backend démarré sur http://localhost:${PORT}`);
  logger.info(`📍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔒 CORS origins: ${allowedOrigins.join(', ')}`);
});
