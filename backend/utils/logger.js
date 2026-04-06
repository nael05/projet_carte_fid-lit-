import winston from 'winston';

const isDev = process.env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: isDev
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    : winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: isDev
        ? winston.format.simple()
        : winston.format.json(),
    }),
    // Logs d'erreur
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Tous les logs
    isDev
      ? null
      : new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
  ].filter(Boolean),
});

export default logger;
