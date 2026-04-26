import bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'crypto';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { generateToken } from '../middlewares/auth.js';
import { createSession, generateDeviceFingerprint } from '../utils/sessionManager.js';
import pool from '../db.js';
import { validatePassword, validatePasswordChange } from '../utils/passwordValidator.js';
import logger from '../utils/logger.js';
import { validateLoginInput } from '../utils/inputValidator.js';
import apnService from '../utils/apnService.js';
import googleWalletGenerator from '../utils/googleWalletGenerator.js';
import { sendLoyaltyUpdateNotification } from '../utils/notificationService.js';
import walletSyncService from '../utils/walletSyncService.js';
import emailService from '../utils/emailService.js';
import crypto from 'crypto';

// ===== HELPERS RGPD =====
const maskPhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 2) return '**';
  return digits.slice(0, 2) + ' ** ** ** **';
};

const maskEmail = (email) => {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.***';
  const domainParts = domain.split('.');
  const tld = domainParts.pop();
  return `${local[0]}***@***.${tld}`;
};

// ===== MASTER ADMIN CONTROLLERS =====

export const adminLogin = async (req, res) => {
  const { identifiant, mot_de_passe } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM super_admins WHERE identifiant = ?',
      [identifiant]
    );

    if (rows.length === 0) {
      logger.warn('Failed admin login attempt - invalid identifiant');
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const admin = rows[0];
    const isPasswordValid = await bcrypt.compare(mot_de_passe, admin.mot_de_passe);

    if (!isPasswordValid) {
      logger.warn('Failed admin login attempt - invalid password');
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = generateToken(admin.id, 'admin');
    logger.info('Admin login successful');
    res.json({ token, message: 'Connecté' });
  } catch (err) {
    logger.error('Admin login error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const getEnterprises = async (req, res) => {
  try {
    const [enterprises] = await pool.query(
      'SELECT id, nom, email, prenom, telephone, statut, loyalty_type, must_change_password, created_at FROM entreprises ORDER BY created_at DESC'
    );

    res.json(enterprises);
  } catch (err) {
    logger.error('Get enterprises error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const getPublicEnterprises = async (req, res) => {
  try {
    const [enterprises] = await pool.query(
      'SELECT id, nom FROM entreprises WHERE statut = "actif" ORDER BY nom ASC'
    );

    res.json(enterprises);
  } catch (err) {
    logger.error('Get public enterprises error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const createCompany = async (req, res) => {
  const { nom, email, prenom, telephone, loyalty_type = 'points' } = req.body;

  if (!nom || !email) {
    return res.status(400).json({ error: 'Nom et email requis' });
  }

  if (!['points', 'stamps'].includes(loyalty_type)) {
    return res.status(400).json({ error: 'Type de fidélité invalide (points ou stamps)' });
  }

  const companyId = randomUUID();
  const tempPassword = randomBytes(12).toString('base64url').substring(0, 16);
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      'INSERT INTO entreprises (id, nom, email, prenom, telephone, mot_de_passe, temporary_password, must_change_password, statut, loyalty_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [companyId, nom, email, prenom || null, telephone || null, hashedPassword, tempPassword, true, 'actif', loyalty_type]
    );

    const configId = randomUUID();
    await connection.query(
      `INSERT INTO loyalty_config (
        id, entreprise_id, loyalty_type, reward_title, reward_description,
        points_per_purchase, points_for_reward, points_adding_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        configId, companyId, loyalty_type,
        'Récompense spéciale',
        loyalty_type === 'points'
          ? 'Vous avez atteint le nombre de points requis!'
          : 'Tous vos tampons sont remplis!',
        10, 100, 'manual'
      ]
    );

    const customizationId = randomUUID();
    await connection.query(
      `INSERT INTO card_customization
       (id, company_id, loyalty_type, primary_color, text_color, accent_color, secondary_color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customizationId, companyId, loyalty_type, '#1f2937', '#ffffff', '#3b82f6', '#374151']
    );

    await connection.commit();

    emailService.sendWelcomeEmail({
      email,
      nom,
      prenom: prenom || null,
      telephone: telephone || null,
      tempPassword,
      loyaltyType: loyalty_type,
      frontendUrl: process.env.FRONTEND_URL || 'https://fidelyzapp.fr'
    }).catch(err => {
      logger.error('Échec envoi email bienvenue (non bloquant)', { error: err.message });
    });

    res.json({
      success: true,
      companyId,
      email,
      temporaryPassword: tempPassword,
      loyalty_type: loyalty_type,
      message: `Entreprise créée avec succès (Mode: ${loyalty_type})`
    });
  } catch (err) {
    await connection.rollback();
    logger.error('Create company error', { error: err.message });
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    connection.release();
  }
};

export const suspendCompany = async (req, res) => {
  const { companyId } = req.params;

  try {
    logger.info('Company suspension request received');

    const [result] = await pool.query(
      'UPDATE entreprises SET statut = "suspendu" WHERE id = ?',
      [companyId]
    );

    if (result.affectedRows === 0) {
      logger.warn('Company not found for suspension');
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    logger.info('Company suspended successfully');
    res.json({ success: true, message: 'Entreprise suspendue' });
  } catch (err) {
    logger.error('Company suspension error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const reactivateCompany = async (req, res) => {
  const { companyId } = req.params;

  try {
    const [result] = await pool.query(
      'UPDATE entreprises SET statut = "actif" WHERE id = ?',
      [companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    logger.info('Company reactivated successfully');
    res.json({ success: true, message: 'Entreprise réactivée' });
  } catch (err) {
    logger.error('Reactivate company error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const deleteCompany = async (req, res) => {
  const { companyId } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM entreprises WHERE id = ?',
      [companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    logger.info('Company deleted successfully');
    res.json({ success: true, message: 'Entreprise supprimée' });
  } catch (err) {
    logger.error('Delete company error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const updateCompany = async (req, res) => {
  const { companyId } = req.params;
  const { nom, email, prenom, telephone } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE entreprises SET nom = ?, email = ?, prenom = ?, telephone = ? WHERE id = ?',
      [nom, email, prenom, telephone, companyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    logger.info('Company updated successfully');
    res.json({ success: true, message: 'Entreprise mise à jour' });
  } catch (err) {
    logger.error('Update company error', { error: err.message });
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Cet email est déjà utilisé par un autre compte' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ===== PRO / COMPANY CONTROLLERS =====

export const proLogin = async (req, res) => {
  const { email, mot_de_passe } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM entreprises WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const company = rows[0];

    if (company.statut === 'suspendu') {
      return res.status(403).json({ error: 'Votre compte est suspendu' });
    }

    const isPasswordValid = await bcrypt.compare(mot_de_passe, company.mot_de_passe);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = generateToken(company.id, 'pro');

    // Générer une empreinte d'appareil unique
    const deviceFingerprint = generateDeviceFingerprint(req);
    const deviceName = req.headers['user-agent']?.substring(0, 100) || 'Unknown Device';

    // 🔐 Convertir must_change_password en boolean strict
    const mustChangePassword = Boolean(company.must_change_password);
    if (mustChangePassword) {
      logger.info('First login - password change required');
    }

    // Créer la session (valide 24h) - OBLIGATOIRE, bloque le login
    try {
      await createSession(company.id, deviceFingerprint, deviceName, token, '24h');
      logger.debug('Session created successfully');
    } catch (sessionErr) {
      logger.error('Session creation failed', { error: sessionErr.message });
      return res.status(500).json({ error: 'Unable to create session' });
    }

    // Retourner les informations de connexion
    res.json({
      token,
      deviceId: deviceFingerprint,
      mustChangePassword,  // ← TOUJOURS boolean
      companyId: company.id,
      nom: company.nom,
      email: company.email,
      statut: company.statut,
      loyaltyType: company.loyalty_type || 'points'
    });
  } catch (err) {
    logger.error('Pro login error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const changePassword = async (req, res) => {
  const { newPassword } = req.body;
  const empresaId = req.user.id;

  try {
    // Vérifier que le champ newPassword existe
    if (!newPassword) {
      return res.status(400).json({ error: 'Le nouveau mot de passe est requis' });
    }

    // Récupérer l'entreprise actuelle
    const [rows] = await pool.query(
      'SELECT mot_de_passe, must_change_password FROM entreprises WHERE id = ?',
      [empresaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    const company = rows[0];

    // 🔐 Vérification 1: Valider la complexité du nouveau mot de passe
    const complexityCheck = validatePassword(newPassword);
    if (!complexityCheck.isValid) {
      return res.status(400).json({
        error: 'Exigences du mot de passe non respectées',
        details: complexityCheck.errors
      });
    }

    // 🔐 Vérification 2: S'assurer que le nouveau mot de passe est différent de l'ancien
    // (Important pour éviter que l'utilisateur garde le même mot de passe temporaire)
    const isSamePassword = await bcrypt.compare(newPassword, company.mot_de_passe);
    if (isSamePassword) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit être différent de l\'ancien mot de passe'
      });
    }

    // 🔐 Vérification 3: Hash du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [updateResult] = await pool.query(
      'UPDATE entreprises SET mot_de_passe = ?, must_change_password = FALSE, temporary_password = NULL WHERE id = ?',
      [hashedPassword, empresaId]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(500).json({ error: 'Impossible de mettre à jour le mot de passe' });
    }

    await pool.query(
      'DELETE FROM sessions WHERE entreprise_id = ? AND device_id != ?',
      [empresaId, req.user.deviceId]
    );

    logger.info('Password changed successfully');

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès',
      mustChangePassword: false
    });
  } catch (err) {
    logger.error('Password change error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};


export const getProInfo = async (req, res) => {
  const empresaId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.nom, e.email, e.recompense_definition,
              lc.points_per_purchase, lc.points_for_reward,
              lc.reward_title, lc.reward_description,
              lc.push_notifications_enabled
       FROM entreprises e
       LEFT JOIN loyalty_config lc ON e.id = lc.entreprise_id
       WHERE e.id = ?`,
      [empresaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    const proInfo = rows[0];
    const safeProInfo = {
      ...proInfo,
      points_per_purchase: Number(proInfo.points_per_purchase || 0),
      points_for_reward: Number(proInfo.points_for_reward || 0),
      push_notifications_enabled: Boolean(proInfo.push_notifications_enabled)
    };

    res.json(safeProInfo);
  } catch (err) {
    logger.error('Get pro info error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const getProStatus = async (req, res) => {
  const empresaId = req.user.id;

  try {
    const [rows] = await pool.query(
      'SELECT id, nom, email, statut, recompense_definition FROM entreprises WHERE id = ?',
      [empresaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    res.json(rows[0]);
  } catch (err) {
    logger.error('Get pro status error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Enumerates active sessions of the enterprise
export const getProSessions = async (req, res) => {
  const empresaId = req.user.id;

  try {
    const [sessions] = await pool.query(
      `SELECT id, device_id, device_name, last_activity, expires_at, created_at
       FROM sessions 
       WHERE entreprise_id = ? AND expires_at > NOW()
       ORDER BY last_activity DESC`,
      [empresaId]
    );

    res.json(sessions.map(s => ({
      ...s,
      isCurrentDevice: s.device_id === req.user.deviceId,
      expiresIn: s.expires_at
    })));
  } catch (err) {
    logger.error('Register client error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 🆕 Déconnecter d'un appareil spécifique
export const logoutProDevice = async (req, res) => {
  const empresaId = req.user.id;
  const { deviceId } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId requis' });
  }

  try {
    const [result] = await pool.query(
      'DELETE FROM sessions WHERE entreprise_id = ? AND device_id = ?',
      [empresaId, deviceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    res.json({ success: true, message: 'Déconnexion de l\'appareil réussie' });
  } catch (err) {
    logger.error('Logout pro device error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 🆕 Déconnecter de tous les appareils (sauf celui actuel optionnel)
export const logoutProAll = async (req, res) => {
  const empresaId = req.user.id;
  const { keepCurrent } = req.body; // Optional: keep current device connected

  try {
    let query = 'DELETE FROM sessions WHERE entreprise_id = ?';
    let params = [empresaId];

    if (keepCurrent && req.user.deviceId) {
      query += ' AND device_id != ?';
      params.push(req.user.deviceId);
    }

    const [result] = await pool.query(query, params);

    res.json({
      success: true,
      message: keepCurrent ? 'Déconnexion de tous les autres appareils' : 'Déconnexion complète',
      devicesRemoved: result.affectedRows
    });
  } catch (err) {
    logger.error('Logout pro all error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const getClients = async (req, res) => {
  const empresaId = req.user.id;

  try {
    // Obtenir le type de fidélité
    const [configRows] = await pool.query(
      'SELECT loyalty_type FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );

    const loyaltyType = configRows.length > 0 ? configRows[0].loyalty_type : 'points';

    const [rows] = await pool.query(
      `SELECT c.id, c.nom, c.prenom, c.telephone, c.email, c.type_wallet,
              c.marketing_optin,
              c.points as points,
              (SELECT COUNT(*) FROM apple_pass_registrations r
               JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number
               WHERE w.client_id = c.id) as device_count
       FROM clients c
       WHERE c.entreprise_id = ?
       ORDER BY c.created_at DESC`,
      [empresaId]
    );

    const maskedRows = rows.map(client => {
      if (client.marketing_optin) return client;
      return {
        ...client,
        telephone: maskPhone(client.telephone),
        email: maskEmail(client.email),
      };
    });

    logger.info(`📋 Fetching ${rows.length} clients for enterprise ${empresaId}.`);
    res.json(maskedRows);
  } catch (err) {
    logger.error('Get clients error for enterprise: ' + empresaId, {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Erreur lors du chargement de la liste des clients' });
  }
};

export const getTransactionHistory = async (req, res) => {
  const empresaId = req.user.id;
  const { dateFrom, dateTo, clientName, type, page = 1 } = req.query;
  const limit = 100;
  const offset = (parseInt(page) - 1) * limit;

  try {
    let where = 'WHERE th.entreprise_id = ?';
    const params = [empresaId];

    if (dateFrom) { where += ' AND DATE(th.created_at) >= ?'; params.push(dateFrom); }
    if (dateTo)   { where += ' AND DATE(th.created_at) <= ?'; params.push(dateTo); }
    if (type)     { where += ' AND th.type = ?'; params.push(type); }
    if (clientName) {
      where += ' AND CONCAT(c.prenom, " ", c.nom) LIKE ?';
      params.push(`%${clientName}%`);
    }

    const [rows] = await pool.query(
      `SELECT th.id, th.type, th.points_change, th.description, th.created_at,
              c.nom, c.prenom, c.telephone
       FROM transaction_history th
       LEFT JOIN clients c ON c.id = th.client_id
       ${where}
       ORDER BY th.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM transaction_history th LEFT JOIN clients c ON c.id = th.client_id ${where}`,
      params
    );

    res.json({ transactions: rows, total: countRows[0].total, page: parseInt(page), limit });
  } catch (err) {
    logger.error('getTransactionHistory error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const deleteTransactionHistory = async (req, res) => {
  const empresaId = req.user.id;
  try {
    await pool.query('DELETE FROM transaction_history WHERE entreprise_id = ?', [empresaId]);
    res.json({ success: true });
  } catch (err) {
    logger.error('deleteTransactionHistory error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const deleteClient = async (req, res) => {
  const { clientId } = req.params;
  const empresaId = req.user.id;

  try {
    // Vérifier que le client appartient bien à l'entreprise
    const [clientRows] = await pool.query(
      'SELECT id FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé ou non autorisé' });
    }

    // Suppression du client (cascades gérées par la DB pour wallet_cards et transaction_history)
    await pool.query(
      'DELETE FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    logger.info(`🗑️ Client supprimé par le pro ${empresaId}: ${clientId}`);
    res.json({ success: true, message: 'Client supprimé avec succès' });
  } catch (err) {
    logger.error('Delete client error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
};

export const handleScan = async (req, res) => {
  const { clientId, points_to_add } = req.body;
  const bodyPoints = typeof points_to_add === 'number' ? points_to_add : Number(points_to_add);
  const empresaId = req.user.id;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId requis' });
  }

  try {
    const [clientRows] = await pool.query(
      'SELECT nom, prenom, points FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé ou non autorisé' });
    }

    const [config] = await pool.query(
      'SELECT points_adding_mode, points_per_purchase, max_points_balance, reward_title FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );

    if (config.length === 0) {
      return res.status(400).json({ error: 'Configuration de fidélité non trouvée' });
    }

    const loyaltyConfig = config[0];

    // Calcul des points à ajouter : On vérifie si on a une valeur numérique valide > 0
    let pointsToAdd = Number(points_to_add);

    // Si la valeur est 0, vide ou invalide, et qu'on est en mode auto, on prend la config
    if ((isNaN(pointsToAdd) || pointsToAdd <= 0) && loyaltyConfig.points_adding_mode === 'automatic') {
      pointsToAdd = Number(loyaltyConfig.points_per_purchase) || 10;
    } else if (isNaN(pointsToAdd) || pointsToAdd < 0) {
      pointsToAdd = 0; // Sécurité pour le mode manuel
    }

    const maxBalance = loyaltyConfig.max_points_balance;
    let newPoints;
    const scanConn = await pool.getConnection();
    try {
      await scanConn.beginTransaction();
      const [[freshClient]] = await scanConn.query(
        'SELECT points FROM clients WHERE id = ? AND entreprise_id = ? FOR UPDATE',
        [clientId, empresaId]
      );
      const currentPoints = Number(freshClient.points) || 0;
      newPoints = currentPoints + pointsToAdd;
      if (maxBalance !== null && maxBalance !== undefined && newPoints > maxBalance) {
        newPoints = maxBalance;
        pointsToAdd = Math.max(0, maxBalance - currentPoints);
      }
      await scanConn.query(
        'UPDATE clients SET points = ? WHERE id = ? AND entreprise_id = ?',
        [newPoints, clientId, empresaId]
      );
      await scanConn.query(
        "INSERT INTO transaction_history (id, client_id, entreprise_id, type, points_change, description) VALUES (?, ?, ?, 'add_points', ?, ?)",
        [randomUUID(), clientId, empresaId, pointsToAdd, pointsToAdd + ' point(s) ajouté(s)']
      );
      await scanConn.commit();
    } catch (txErr) {
      await scanConn.rollback();
      throw txErr;
    } finally {
      scanConn.release();
    }

    sendLoyaltyUpdateNotification(clientId, empresaId, pointsToAdd, false).catch(e =>
      logger.warn('Push scan notification failed', e.message)
    );

    // 🚀 RÉPONSE RAPIDE : On ne recalcule pas tout (le frontend a déjà les infos du lookup)
    res.json({
      success: true,
      clientId,
      clientName: clientRows[0].prenom + ' ' + clientRows[0].nom,
      pointsAdded: pointsToAdd,
      newPoints: newPoints
    });
  } catch (err) {
    logger.error('Handle scan error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * Recherche les infos d'un client lors d'un scan (Sans modification)
 */
export const getScanInfo = async (req, res) => {
  const { clientId } = req.params;
  const empresaId = req.user.id;

  try {
    const [clientRows] = await pool.query(
      'SELECT nom, prenom, points FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const client = clientRows[0];

    // 1. Récupérer TOUS les paliers pour affichage complet
    const [allTiers] = await pool.query(
      'SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC',
      [empresaId]
    );

    // 2. Détection du prochain palier (motivation)
    const [nextTiers] = await pool.query(
      'SELECT * FROM reward_tiers WHERE entreprise_id = ? AND points_required > ? ORDER BY points_required ASC LIMIT 1',
      [empresaId, client.points]
    );

    res.json({
      success: true,
      clientName: `${client.prenom} ${client.nom}`,
      currentPoints: client.points || 0,
      allRewards: allTiers,
      nextTier: nextTiers.length > 0 ? nextTiers[0] : null
    });

  } catch (err) {
    logger.error('Error in getScanInfo', err);
    res.status(500).json({ error: 'Erreur serveur lors de la lecture des infos client' });
  }
};

/**
 * Finalise une transaction complète (Cadeau + Points)
 */
export const finalizeFullTransaction = async (req, res) => {
  const { clientId, pointsToAdd, rewardTierId } = req.body;
  const empresaId = req.user.id;

  try {
    const [clientCheck] = await pool.query(
      'SELECT id FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );
    if (clientCheck.length === 0) return res.status(404).json({ error: 'Client non trouvé' });

    const [cfgRows] = await pool.query(
      'SELECT max_points_balance FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );
    const maxBalance = cfgRows.length > 0 ? cfgRows[0].max_points_balance : null;

    let tier = null;
    if (rewardTierId) {
      const [tierRows] = await pool.query(
        'SELECT id, title, points_required FROM reward_tiers WHERE id = ? AND entreprise_id = ?',
        [rewardTierId, empresaId]
      );
      if (tierRows.length > 0) tier = tierRows[0];
    }

    let currentPoints;
    let totalChange = 0;
    const descriptionParts = [];
    const pendingWrites = [];

    const ftConn = await pool.getConnection();
    try {
      await ftConn.beginTransaction();

      const [[freshClient]] = await ftConn.query(
        'SELECT points FROM clients WHERE id = ? AND entreprise_id = ? FOR UPDATE',
        [clientId, empresaId]
      );
      currentPoints = Number(freshClient.points) || 0;

      if (tier) {
        if (currentPoints >= tier.points_required) {
          currentPoints -= tier.points_required;
          totalChange -= tier.points_required;
          descriptionParts.push(`Cadeau "${tier.title}" utilisé (-${tier.points_required} pts)`);
          pendingWrites.push([
            "INSERT INTO transaction_history (id, client_id, entreprise_id, type, points_change, description) VALUES (?, ?, ?, 'redeem_reward', ?, ?)",
            [randomUUID(), clientId, empresaId, -tier.points_required, `Utilisation : ${tier.title}`]
          ]);
        } else {
          await ftConn.rollback();
          return res.status(400).json({ error: 'Points insuffisants pour ce cadeau' });
        }
      }

      let ptsToAdd = Number(pointsToAdd) || 0;
      if (maxBalance !== null && maxBalance !== undefined && ptsToAdd > 0) {
        const roomLeft = Math.max(0, maxBalance - currentPoints);
        ptsToAdd = Math.min(ptsToAdd, roomLeft);
      }
      if (ptsToAdd > 0) {
        currentPoints += ptsToAdd;
        totalChange += ptsToAdd;
        descriptionParts.push(`${ptsToAdd} points ajoutés pour l'achat`);
        pendingWrites.push([
          "INSERT INTO transaction_history (id, client_id, entreprise_id, type, points_change, description) VALUES (?, ?, ?, 'add_points', ?, ?)",
          [randomUUID(), clientId, empresaId, ptsToAdd, `${ptsToAdd} points ajoutés`]
        ]);
      }

      pendingWrites.push([
        'UPDATE clients SET points = ? WHERE id = ? AND entreprise_id = ?',
        [currentPoints, clientId, empresaId]
      ]);

      for (const [sql, params] of pendingWrites) {
        await ftConn.query(sql, params);
      }
      await ftConn.commit();
    } catch (txErr) {
      await ftConn.rollback();
      throw txErr;
    } finally {
      ftConn.release();
    }

    const { sendLoyaltyUpdateNotification } = await import('../utils/notificationService.js');
    sendLoyaltyUpdateNotification(clientId, empresaId, totalChange, rewardTierId ? true : false).catch(e =>
      logger.warn('Push transaction notification failed', e.message)
    );

    res.json({
      success: true,
      newPoints: currentPoints,
      message: descriptionParts.join(' | ') || 'Transaction effectuée'
    });

  } catch (err) {
    logger.error('Error in finalizeFullTransaction', err);
    res.status(500).json({ error: 'Erreur lors de la finalisation de la transaction' });
  }
};

export const adjustPoints = async (req, res) => {
  const { clientId } = req.params;
  const { adjustment } = req.body;
  const empresaId = req.user.id;

  if (isNaN(Number(adjustment))) {
    return res.status(400).json({ error: 'Ajustement numérique requis' });
  }

  try {
    const [clientRows] = await pool.query(
      'SELECT points, nom FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé ou non autorisé' });
    }

    const adj = Number(adjustment);
    let newPoints;
    const adjConn = await pool.getConnection();
    try {
      await adjConn.beginTransaction();
      const [[freshClient]] = await adjConn.query(
        'SELECT points FROM clients WHERE id = ? AND entreprise_id = ? FOR UPDATE',
        [clientId, empresaId]
      );
      newPoints = Math.max(0, Number(freshClient.points || 0) + adj);
      await adjConn.query(
        'UPDATE clients SET points = ? WHERE id = ? AND entreprise_id = ?',
        [newPoints, clientId, empresaId]
      );
      await adjConn.query(
        "INSERT INTO transaction_history (id, client_id, entreprise_id, type, points_change, description) VALUES (?, ?, ?, ?, ?, ?)",
        [randomUUID(), clientId, empresaId,
         adj >= 0 ? 'add_points' : 'remove_points',
         adj,
         adj >= 0 ? `${adj} point(s) ajouté(s) manuellement` : `${Math.abs(adj)} point(s) retiré(s)`
        ]
      );
      await adjConn.commit();
    } catch (txErr) {
      await adjConn.rollback();
      throw txErr;
    } finally {
      adjConn.release();
    }

    sendLoyaltyUpdateNotification(clientId, empresaId, adjustment, false).catch(e =>
      logger.warn('Push adjust notification failed', e.message)
    );

    res.json({ success: true, newPoints });
  } catch (err) {
    logger.error('Adjust points error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};



export const getCompanyInfo = async (req, res) => {
  const { companyId } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT id, nom, email, statut FROM entreprises WHERE id = ?',
      [companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    res.json(rows[0]);
  } catch (err) {
    logger.error('Get company info error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const registerClientAndGeneratePass = async (req, res) => {
  const { entrepriseId } = req.params;
  const { nom, prenom, telephone, email, type_wallet, marketing_optin } = req.body;

  if (!nom || !prenom || !telephone || !type_wallet) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }

  if (!['apple', 'google'].includes(type_wallet)) {
    return res.status(400).json({ error: 'Type de wallet invalide' });
  }

  try {
    const [companyRows] = await pool.query(
      'SELECT id, nom FROM entreprises WHERE id = ? AND statut = "actif"',
      [entrepriseId]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée ou inactive' });
    }

    const [dupRows] = await pool.query(
      'SELECT id FROM clients WHERE telephone = ? AND entreprise_id = ?',
      [telephone, entrepriseId]
    );
    if (dupRows.length > 0) {
      return res.status(409).json({ error: 'Numéro déjà inscrit ici.' });
    }

    const clientId = randomUUID();
    const marketingOptinValue = marketing_optin === true || marketing_optin === 'true' ? 1 : 0;
    await pool.query(
      'INSERT INTO clients (id, entreprise_id, nom, prenom, telephone, email, points, type_wallet, marketing_optin) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
      [clientId, entrepriseId, nom, prenom, telephone, email, type_wallet, marketingOptinValue]
    );

    logger.info(`✅ Client créé avec succès: ${clientId} (${prenom} ${nom}), marketing_optin=${marketingOptinValue}`);

    // Retour explicite du clientId
    return res.status(201).json({
      success: true,
      clientId: clientId,
      message: 'Client créé avec succès'
    });
  } catch (err) {
    logger.error('Erreur lors de la création du client (SQL/Logic):', { error: err.message });
    return res.status(500).json({ error: 'Erreur lors de la création de la carte' });
  }
};


// ===== CARD CUSTOMIZATION CONTROLLERS =====

export const getCardCustomization = async (req, res) => {
  const companyId = req.params.companyId ?? req.params.empresaId;
  const { loyaltyType } = req.query;

  try {
    if (!loyaltyType || !['points', 'stamps'].includes(loyaltyType)) {
      return res.status(400).json({ error: 'loyaltyType invalide' });
    }

    const [customization] = await pool.query(
      'SELECT * FROM card_customization WHERE company_id = ? AND loyalty_type = ?',
      [companyId, loyaltyType]
    );

    if (customization.length === 0) {
      // Retourner les paramètres par défaut si aucune personnalisation
      return res.json({
        primary_color: '#1f2937',
        text_color: '#ffffff',
        accent_color: '#3b82f6',
        secondary_color: '#374151',
        logo_url: null,
        background_pattern: 'solid',
        card_title: '',
        card_subtitle: '',
        footer_text: '',
        back_fields_info: '',
        back_fields_terms: '',
        back_fields_website: '',
        back_fields_phone: '',
        back_fields_address: '',
        back_fields_instagram: '',
        back_fields_facebook: '',
        back_fields_tiktok: '',
        apple_organization_name: '',
        apple_pass_description: 'Votre carte de fidélité numérique',
        google_primary_color: '#1f2937',
        google_text_color: '#ffffff',
        google_logo_url: null,
        google_hero_image_url: null,
        google_card_title: '',
        google_card_subtitle: '',
        apple_review_url: '',
        google_review_url: '',
        locations: []
      });
    }

    let parsedResult = { ...customization[0] };
    if (typeof parsedResult.locations === 'string') {
      try {
        parsedResult.locations = JSON.parse(parsedResult.locations);
      } catch (e) {
        logger.warn('locations JSON parse error in getCardCustomization', { raw: parsedResult.locations, error: e.message });
        parsedResult.locations = [];
      }
    }

    res.json(parsedResult);
  } catch (err) {
    logger.error('Load card customization error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const updateCardCustomization = async (req, res) => {
  const { empresaId } = req.params;
  const { loyaltyType } = req.query;
  const {
    primary_color,
    text_color,
    accent_color,
    secondary_color,
    logo_url,
    icon_url,
    strip_image_url,
    logo_text,
    card_subtitle,
    card_title,
    back_fields_info,
    back_fields_terms,
    back_fields_website,
    back_fields_phone,
    back_fields_address,
    back_fields_instagram,
    back_fields_facebook,
    back_fields_tiktok,
    apple_organization_name,
    apple_pass_description,
    apple_background_color,
    apple_text_color,
    apple_label_color,
    apple_logo_url,
    apple_icon_url,
    apple_strip_image_url,
    latitude,
    longitude,
    relevant_text,
    google_primary_color,
    google_text_color,
    google_logo_url,
    google_hero_image_url,
    google_card_title,
    google_card_subtitle,
    google_back_phone,
    google_back_website,
    google_back_address,
    google_back_instagram,
    google_back_facebook,
    google_back_tiktok,
    apple_review_url,
    google_review_url,
    locations
  } = req.body;

  try {
    if (empresaId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    if (!loyaltyType || !['points', 'stamps'].includes(loyaltyType)) {
      return res.status(400).json({ error: 'loyaltyType invalide' });
    }

    const [existing] = await pool.query(
      'SELECT id, relevant_text AS prev_relevant_text FROM card_customization WHERE company_id = ? AND loyalty_type = ?',
      [empresaId, loyaltyType]
    );

    if (existing.length === 0) {
      const customizationId = randomUUID();
      await pool.query(
        `INSERT INTO card_customization 
         (id, company_id, loyalty_type, primary_color, text_color, accent_color, secondary_color,
          logo_url, icon_url, strip_image_url, logo_text, card_subtitle, card_title,
          back_fields_info, back_fields_terms, back_fields_website, 
          back_fields_phone, back_fields_address, back_fields_instagram, back_fields_facebook, back_fields_tiktok,
          apple_organization_name, apple_pass_description,
          apple_background_color, apple_text_color, apple_label_color, apple_logo_url, apple_icon_url, apple_strip_image_url,
          latitude, longitude, relevant_text,
          google_primary_color, google_text_color, google_logo_url,
          google_hero_image_url, google_card_title, google_card_subtitle,
          google_back_phone, google_back_website, google_back_address,
          google_back_instagram, google_back_facebook, google_back_tiktok,
          apple_review_url, google_review_url,
          locations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customizationId, empresaId, loyaltyType,
          primary_color || '#1f2937', text_color || '#ffffff', accent_color || '#3b82f6', secondary_color || '#374151',
          logo_url || null, icon_url || null, strip_image_url || null, logo_text || null,
          card_subtitle || '', card_title || '',
          back_fields_info || null, back_fields_terms || null, back_fields_website || null,
          back_fields_phone || null, back_fields_address || null, back_fields_instagram || null, back_fields_facebook || null, back_fields_tiktok || null,
          apple_organization_name || null, apple_pass_description || null,
          apple_background_color || null, apple_text_color || null, apple_label_color || null,
          apple_logo_url || null, apple_icon_url || null, apple_strip_image_url || null,
          latitude || null, longitude || null, relevant_text || null,
          google_primary_color || '#1f2937', google_text_color || '#ffffff', google_logo_url || null,
          google_hero_image_url || null, google_card_title || '', google_card_subtitle || '',
          google_back_phone || null, google_back_website || null, google_back_address || null,
          google_back_instagram || null, google_back_facebook || null, google_back_tiktok || null,
          apple_review_url || null, google_review_url || null,
          Array.isArray(locations) ? JSON.stringify(locations.slice(0, 50)) : null
        ]
      );
    } else {
      await pool.query(
        `UPDATE card_customization SET 
         primary_color = ?, text_color = ?, accent_color = ?, secondary_color = ?,
         logo_url = ?, icon_url = ?, strip_image_url = ?, logo_text = ?, 
         card_subtitle = ?, card_title = ?, 
         back_fields_info = ?, back_fields_terms = ?, back_fields_website = ?,
         back_fields_phone = ?, back_fields_address = ?, back_fields_instagram = ?, back_fields_facebook = ?, back_fields_tiktok = ?,
         apple_organization_name = ?, apple_pass_description = ?,
         apple_background_color = ?, apple_text_color = ?, apple_label_color = ?,
         apple_logo_url = ?, apple_icon_url = ?, apple_strip_image_url = ?,
         latitude = ?, longitude = ?, relevant_text = ?,
         google_primary_color = ?, google_text_color = ?, google_logo_url = ?,
         google_hero_image_url = ?, google_card_title = ?, google_card_subtitle = ?,
         google_back_phone = ?, google_back_website = ?, google_back_address = ?,
         google_back_instagram = ?, google_back_facebook = ?, google_back_tiktok = ?,
         apple_review_url = ?, google_review_url = ?,
         locations = ?, updated_at = NOW()
         WHERE company_id = ? AND loyalty_type = ?`,
        [
          primary_color || '#1f2937',
          text_color || '#ffffff',
          accent_color || '#3b82f6',
          secondary_color || '#374151',
          logo_url || null,
          icon_url || null,
          strip_image_url || null,
          logo_text || null,
          card_subtitle || '',
          card_title || '',
          back_fields_info || null,
          back_fields_terms || null,
          back_fields_website || null,
          back_fields_phone || null,
          back_fields_address || null,
          back_fields_instagram || null,
          back_fields_facebook || null,
          back_fields_tiktok || null,
          apple_organization_name || null,
          apple_pass_description || null,
          apple_background_color || null,
          apple_text_color || null,
          apple_label_color || null,
          apple_logo_url || null,
          apple_icon_url || null,
          apple_strip_image_url || null,
          latitude || null,
          longitude || null,
          relevant_text || null,
          google_primary_color || '#1f2937',
          google_text_color || '#ffffff',
          google_logo_url || null,
          google_hero_image_url || null,
          google_card_title || '',
          google_card_subtitle || '',
          google_back_phone || null,
          google_back_website || null,
          google_back_address || null,
          google_back_instagram || null,
          google_back_facebook || null,
          google_back_tiktok || null,
          apple_review_url || null,
          google_review_url || null,
          Array.isArray(locations) ? JSON.stringify(locations.slice(0, 50)) : null,
          empresaId,
          loyaltyType
        ]
      );
    }

    // Push visible si l'offre en cours vient d'être créée ou modifiée
    const prevOffer = existing[0]?.prev_relevant_text || '';
    if (relevant_text && relevant_text.trim() !== prevOffer) {
      const offerText = relevant_text.trim();

      // Apple Wallet — alert push
      const [pushRegs] = await pool.query(
        `SELECT DISTINCT r.push_token
         FROM apple_pass_registrations r
         JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number
         WHERE w.company_id = ?`,
        [empresaId]
      );
      if (pushRegs.length > 0) {
        apnService.sendBulkAlertNotifications(
          pushRegs.map(r => r.push_token),
          'Nouvelle offre !',
          offerText
        ).catch(err => logger.error('Offer push Apple failed', err.message));
      }

      // Google Wallet — addMessageToObject (TEXT_AND_NOTIFY → notif système)
      const [googleWallets] = await pool.query(
        `SELECT client_id FROM wallet_cards WHERE company_id = ? AND pass_serial_number LIKE 'GOOGLE_%'`,
        [empresaId]
      );
      if (googleWallets.length > 0) {
        Promise.all(
          googleWallets.map(w =>
            googleWalletGenerator.addMessageToObject(w.client_id, 'Nouvelle offre !', offerText)
              .catch(err => logger.error(`Offer push Google client ${w.client_id} failed`, err.message))
          )
        ).catch(() => {});
      }
    }

    // 📱 Synchronisation en temps réel (Apple & Google) via WalletSyncService
    walletSyncService.syncCompanyWallets(empresaId).catch(err =>
      logger.error('Global synchronization failed after customization update', err)
    );

    res.json({
      success: true,
      message: `Personnalisation ${loyaltyType} mise à jour avec succès`
    });
  } catch (err) {
    logger.error('Update card customization error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const updateCardCustomizationGPS = async (req, res) => {
  const empresaId = req.params.empresaId;
  const { relevant_text, locations } = req.body;
  const loyaltyType = req.query.loyaltyType || 'points';

  if (empresaId !== req.user.id) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT relevant_text AS prev_relevant_text FROM card_customization WHERE company_id = ? AND loyalty_type = ?',
      [empresaId, loyaltyType]
    );

    await pool.query(
      'UPDATE card_customization SET relevant_text = ?, locations = ?, updated_at = NOW() WHERE company_id = ? AND loyalty_type = ?',
      [
        relevant_text || null,
        Array.isArray(locations) ? JSON.stringify(locations.slice(0, 50)) : null,
        empresaId,
        loyaltyType
      ]
    );

    const prevOffer = existing[0]?.prev_relevant_text || '';
    if (relevant_text && relevant_text.trim() !== prevOffer) {
      const offerText = relevant_text.trim();

      const [pushRegs] = await pool.query(
        `SELECT DISTINCT r.push_token
         FROM apple_pass_registrations r
         JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number
         WHERE w.company_id = ?`,
        [empresaId]
      );
      if (pushRegs.length > 0) {
        apnService.sendBulkAlertNotifications(pushRegs.map(r => r.push_token), 'Nouvelle offre !', offerText)
          .catch(err => logger.error('Offer push Apple failed', err.message));
      }

      const [googleWallets] = await pool.query(
        `SELECT client_id FROM wallet_cards WHERE company_id = ? AND pass_serial_number LIKE 'GOOGLE_%'`,
        [empresaId]
      );
      if (googleWallets.length > 0) {
        Promise.all(
          googleWallets.map(w =>
            googleWalletGenerator.addMessageToObject(w.client_id, 'Nouvelle offre !', offerText)
              .catch(err => logger.error(`Offer push Google client ${w.client_id} failed`, err.message))
          )
        ).catch(() => {});
      }
    }

    walletSyncService.syncCompanyWallets(empresaId).catch(err =>
      logger.error('Sync failed after GPS update', err)
    );

    res.json({ success: true });
  } catch (err) {
    logger.error('Update GPS customization error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const uploadLogo = async (req, res) => {
  const { imageType, platform } = req.query; // 'logo', 'icon', 'strip', 'hero' + 'apple'/'google'

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    const tempPath = req.file.path;
    const finalFilename = req.file.filename + '-resized.png';
    const finalPath = path.join(req.file.destination, finalFilename);

    // Define sizes based on type and platform
    // Logan Apple: Hauteur max 50px, largeur proportinelle (max 160px) sans padding
    let resizeOpts = { height: 50, width: 160, fit: 'inside' };

    if (platform === 'google') {
      if (imageType === 'logo') {
        // Google recommande 660x660 carré pour le logo
        resizeOpts = { width: 660, height: 660, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } };
      } else if (imageType === 'hero') {
        // Hero image 1032x336 (3:1)
        resizeOpts = { width: 1032, height: 336, fit: 'cover' };
      }
    } else {
      // Logic Apple (ou par défaut)
      if (imageType === 'icon' || imageType === 'notification_icon') {
        resizeOpts = { width: 58, height: 58, fit: 'cover' }; // @2x size for clarity
      } else if (imageType === 'strip') {
        // Bannière Apple: 375x123 (on utilise fit: cover pour "rogner" si nécessaire)
        resizeOpts = { width: 375, height: 123, fit: 'cover' };
      }
    }

    // Processing avec Sharp
    await sharp(tempPath)
      .rotate() // Gère l'orientation automatique (photos smartphone)
      .resize(resizeOpts) // On a retiré withoutEnlargement pour forcer la taille minimale
      .png()
      .toFile(finalPath);

    fs.unlinkSync(tempPath);

    // Return relative path instead of absolute URL to ensure portability
    const fileUrl = `uploads/${finalFilename}`;

    res.json({ success: true, url: fileUrl });
  } catch (err) {
    logger.error('Upload image error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const redeemReward = async (req, res) => {
  const { clientId, rewardTierId } = req.body;
  const empresaId = req.user.id;
  try {
    const [tiers] = await pool.query('SELECT * FROM reward_tiers WHERE id = ? AND entreprise_id = ?', [rewardTierId, empresaId]);
    if (tiers.length === 0) return res.status(404).json({ error: 'Récompense invalide' });
    const tier = tiers[0];
    let newPoints;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[clientRow]] = await conn.query(
        'SELECT points FROM clients WHERE id = ? AND entreprise_id = ? FOR UPDATE',
        [clientId, empresaId]
      );
      if (!clientRow) {
        await conn.rollback();
        return res.status(404).json({ error: 'Client introuvable' });
      }
      const currentPoints = clientRow.points || 0;
      if (currentPoints < tier.points_required) {
        await conn.rollback();
        return res.status(400).json({ error: 'Points insuffisants' });
      }
      newPoints = currentPoints - tier.points_required;
      await conn.query('UPDATE clients SET points = ? WHERE id = ? AND entreprise_id = ?', [newPoints, clientId, empresaId]);
      await conn.query(
        "INSERT INTO transaction_history (id, client_id, entreprise_id, type, points_change, description) VALUES (?, ?, ?, 'redeem_reward', ?, ?)",
        [randomUUID(), clientId, empresaId, -tier.points_required, `Utilisation : ${tier.title}`]
      );
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    sendLoyaltyUpdateNotification(clientId, empresaId, -tier.points_required, true).catch(pushErr =>
      logger.warn('Push redeem notification failed', pushErr.message)
    );

    res.json({ success: true, message: 'Cadeau validé ! (-' + tier.points_required + ' pts)', newPoints });
  } catch (err) {
    logger.error('Redeem reward error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ===== PASSWORD RESET CONTROLLERS =====

/**
 * Demande de réinitialisation de mot de passe
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  try {
    // 1. Vérifier si l'email existe dans la table entreprises
    const [rows] = await pool.query(
      'SELECT id, nom FROM entreprises WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      // Pour la sécurité, on ne dit pas si l'email existe ou pas
      return res.json({
        success: true,
        message: 'Si cet email est enregistré, vous recevrez un lien de réinitialisation sous peu.'
      });
    }

    // 2. Générer un jeton sécurisé
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 heure de validité

    // 3. Enregistrer en base de données (supprimer les anciens jetons pour cet email avant)
    await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);
    await pool.query(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expiresAt]
    );

    // 4. Envoyer l'email
    const frontendUrl = process.env.FRONTEND_URL || 'https://fidelyzapp.fr';
    const resetUrl = `${frontendUrl}/password-recovery?token=${token}`;
    await emailService.sendPasswordResetEmail(email, resetUrl);

    res.json({
      success: true,
      message: 'Si cet email est enregistré, vous recevrez un lien de réinitialisation sous peu.'
    });
  } catch (err) {
    logger.error('Forgot password error', { error: err.message });
    res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
  }
};

/**
 * Exécution de la réinitialisation de mot de passe
 */
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
  }

  try {
    const [resetRows] = await pool.query(
      'SELECT email FROM password_resets WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (resetRows.length === 0) {
      return res.status(400).json({ error: 'Jeton invalide ou expiré' });
    }

    const email = resetRows[0].email;

    const [deleteResult] = await pool.query(
      'DELETE FROM password_resets WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (deleteResult.affectedRows === 0) {
      return res.status(400).json({ error: 'Jeton invalide ou expiré' });
    }

    const complexityCheck = validatePassword(newPassword);
    if (!complexityCheck.isValid) {
      return res.status(400).json({ error: 'Exigences du mot de passe non respectées', details: complexityCheck.errors });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE entreprises SET mot_de_passe = ?, updated_at = NOW() WHERE email = ?',
      [hashedPassword, email]
    );

    await pool.query(
      'DELETE FROM sessions WHERE entreprise_id = (SELECT id FROM entreprises WHERE email = ?)',
      [email]
    );

    logger.info(`✅ Mot de passe réinitialisé avec succès pour ${email}`);

    res.json({
      success: true,
      message: 'Votre mot de passe a été mis à jour avec succès.'
    });
  } catch (err) {
    logger.error('Reset password error', { error: err.message });
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
};
