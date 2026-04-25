import rateLimit from 'express-rate-limit';
import pool from '../db.js';

class MySQLRateLimitStore {
  constructor(windowMs) {
    this.windowMs = windowMs;
    pool.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_store (
        key_id VARCHAR(255) NOT NULL,
        hits INT UNSIGNED NOT NULL DEFAULT 1,
        reset_time BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (key_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).catch(() => {});
  }

  async increment(key) {
    const now = Date.now();
    const resetTime = now + this.windowMs;
    await pool.query(
      `INSERT INTO rate_limit_store (key_id, hits, reset_time)
       VALUES (?, 1, ?)
       ON DUPLICATE KEY UPDATE
         hits = IF(reset_time <= ?, 1, hits + 1),
         reset_time = IF(reset_time <= ?, ?, reset_time)`,
      [key, resetTime, now, now, resetTime]
    );
    const [[row]] = await pool.query(
      'SELECT hits, reset_time FROM rate_limit_store WHERE key_id = ?',
      [key]
    );
    return { totalHits: row.hits, resetTime: new Date(Number(row.reset_time)) };
  }

  async decrement(key) {
    await pool.query(
      'UPDATE rate_limit_store SET hits = GREATEST(0, hits - 1) WHERE key_id = ?',
      [key]
    );
  }

  async resetKey(key) {
    await pool.query('DELETE FROM rate_limit_store WHERE key_id = ?', [key]);
  }
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: new MySQLRateLimitStore(15 * 60 * 1000),
  message: 'Trop de tentatives de connexion, réessayez plus tard',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  store: new MySQLRateLimitStore(1 * 60 * 1000),
  skip: (req) => process.env.NODE_ENV === 'development',
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  store: new MySQLRateLimitStore(60 * 60 * 1000),
  skip: (req) => process.env.NODE_ENV === 'development',
});

export default loginLimiter;
