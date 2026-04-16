import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import pool from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Endpoint admin pour exécuter les migrations
 * POST /api/admin/migrations/run
 */
export const runMigrations = async (req, res) => {
  try {
    // Lire le fichier migration
    const migrationPath = path.join(__dirname, '../migrations/repair-wallet-cards.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return res.status(404).json({ error: 'Migration file not found' });
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Diviser par les ; pour exécuter chaque statement
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    let executed = 0;
    for (const statement of statements) {
      if (statement.trim().startsWith('--') || statement.trim().length === 0) continue;
      
      try {
        await pool.query(statement);
        executed++;
      } catch (stmtErr) {
        // Ignorer certaines erreurs (table existe, champ existe)
        if (stmtErr.message.includes('already exists') || 
            stmtErr.message.includes('Duplicate') ||
            stmtErr.message.includes('no such table') ||
            stmtErr.message.includes('Unknown table')) {
          logger.warn(`Skipped: ${stmtErr.message.substring(0, 50)}...`);
          continue;
        }
        // Autres erreurs = vraie erreur
        throw stmtErr;
      }
    }

    logger.info(`✅ Migrations exécutées: ${executed} tables`);

    res.json({
      success: true,
      message: 'Migrations completées',
      executed,
      tables: [
        'wallet_cards',
        'apple_pass_registrations',
        'pass_update_logs'
      ]
    });

  } catch (err) {
    logger.error('Migration error', { error: err.message });
    res.status(500).json({ 
      error: 'Migration failed', 
      details: err.message 
    });
  }
};
