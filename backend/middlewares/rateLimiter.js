import rateLimit from 'express-rate-limit';

// Limiter les tentatives de login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: 'Trop de tentatives de connexion, réessayez plus tard',
  standardHeaders: true, // Retourner les infos de rate-limit dans `RateLimit-*` headers
  legacyHeaders: false, // Désactiver `X-RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV === 'development', // Désactiver en dev
});

// Limiter les requêtes générales (plus permissif)
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requêtes par minute
  skip: (req) => process.env.NODE_ENV === 'development',
});

// Limiter les uploads/actions critiques
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 actions par heure
  skip: (req) => process.env.NODE_ENV === 'development',
});

export default loginLimiter;
