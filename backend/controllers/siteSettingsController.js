import pool from '../db.js';
import logger from '../utils/logger.js';

/**
 * GET /api/settings/mentions-legales  (public)
 */
export const getMentionsLegales = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT setting_value FROM site_settings WHERE setting_key = ?',
      ['mentions_legales']
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contenu non trouvé' });
    }

    res.json({ content: rows[0].setting_value });
  } catch (err) {
    logger.error('getMentionsLegales error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * PUT /api/admin/settings/mentions-legales  (admin only)
 */
export const updateMentionsLegales = async (req, res) => {
  const { content } = req.body;

  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Le champ "content" (string) est requis' });
  }

  try {
    await pool.query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('mentions_legales', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [content]
    );

    logger.info(`✏️ Mentions légales mises à jour par admin ${req.user?.id}`);
    res.json({ success: true, message: 'Mentions légales mises à jour' });
  } catch (err) {
    logger.error('updateMentionsLegales error', { error: err.message });
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};
