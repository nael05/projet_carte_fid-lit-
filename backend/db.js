import 'dotenv/config';
import mysql from 'mysql2/promise.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'loyalty_saas',
  socketPath: process.env.DB_SOCKET_PATH || undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Évite le MaxListenersExceededWarning lors de requêtes concurrentes élevées
pool.pool.setMaxListeners(50);
pool.pool.on('connection', (connection) => connection.setMaxListeners(50));

export default pool;
