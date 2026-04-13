import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { generateToken } from '../middlewares/auth.js';
import { createSession, generateDeviceFingerprint } from '../utils/sessionManager.js';
import pool from '../db.js';
import { validatePassword } from '../utils/passwordValidator.js';
import logger from '../utils/logger.js';
import { apnService } from '../utils/apnService.js';
import googleWalletGenerator from '../utils/googleWalletGenerator.js';
import { sendLoyaltyUpdateNotification } from '../utils/notificationService.js';

// ===== PRO / COMPANY CONTROLLERS =====

export const proLogin = async (req, res) => {
  const { email, mot_de_passe } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM entreprises WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const company = rows[0];
    if (company.statut === 'suspendu') return res.status(403).json({ error: 'Votre compte est suspendu' });
    const isPasswordValid = await bcrypt.compare(mot_de_passe, company.mot_de_passe);
    if (!isPasswordValid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const token = generateToken(company.id, 'pro');
    const deviceFingerprint = generateDeviceFingerprint(req);
    const deviceName = req.headers['user-agent']?.substring(0, 100) || 'Unknown Device';
    await createSession(company.id, deviceFingerprint, deviceName, token, '24h');
    res.json({
      token,
      deviceId: deviceFingerprint,
      mustChangePassword: Boolean(company.must_change_password),
      companyId: company.id,
      nom: company.nom,
      email: company.email,
      statut: company.statut,
      loyaltyType: company.loyalty_type || 'points'
    });
  } catch (err) {
    logger.error('Pro login error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const getClients = async (req, res) => {
  const empresaId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.nom, c.prenom, c.telephone, c.email, c.type_wallet, c.points
       FROM clients c WHERE c.entreprise_id = ? ORDER BY c.created_at DESC`,
      [empresaId]
    );
    res.json(rows);
  } catch (err) {
    logger.error('Get clients error', err);
    res.status(500).json({ error: 'Erreur lors du chargement des clients' });
  }
};

export const handleScan = async (req, res) => {
  const { clientId, points_to_add } = req.body;
  const empresaId = req.user.id;
  if (!clientId) return res.status(400).json({ error: 'clientId requis' });
  try {
    const [clientRows] = await pool.query('SELECT points FROM clients WHERE id = ? AND entreprise_id = ?', [clientId, empresaId]);
    if (clientRows.length === 0) return res.status(404).json({ error: 'Client non trouvé' });
    const [config] = await pool.query('SELECT points_adding_mode, points_per_purchase FROM loyalty_config WHERE entreprise_id = ?', [empresaId]);
    const loyaltyConfig = config[0] || { points_per_purchase: 10 };
    let pointsToAdd = Number(loyaltyConfig.points_per_purchase) || 10;
    if (loyaltyConfig.points_adding_mode === 'manual') pointsToAdd = Number(points_to_add) || 0;
    const newPoints = (Number(clientRows[0].points) || 0) + pointsToAdd;
    await pool.query('UPDATE clients SET points = ? WHERE id = ?', [newPoints, clientId]);
    
    // SYNC WALLETS (Apple & Google)
    const [wallets] = await pool.query('SELECT id, pass_serial_number FROM wallet_cards WHERE client_id = ?', [clientId]);
    for (const w of wallets) {
      await pool.query('UPDATE wallet_cards SET points_balance = ? WHERE id = ?', [newPoints, w.id]);
      if (w.pass_serial_number && !w.pass_serial_number.startsWith('GOOGLE_')) {
        const [regs] = await pool.query('SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?', [w.pass_serial_number]);
        if (regs.length > 0) await apnService.sendBulkUpdateNotifications(regs.map(r => r.push_token));
      } else if (w.pass_serial_number && w.pass_serial_number.startsWith('GOOGLE_')) {
        await googleWalletGenerator.updateLoyaltyPoints(clientId, newPoints);
      }
    }
    await sendLoyaltyUpdateNotification(clientId, empresaId, pointsToAdd, false);
    res.json({ success: true, newPoints, pointsAdded: pointsToAdd });
  } catch (err) {
    logger.error('Scan error', err);
    res.status(500).json({ error: err.message });
  }
};

export const adjustPoints = async (req, res) => {
  const { clientId } = req.params;
  const { adjustment } = req.body;
  const empresaId = req.user.id;
  try {
    const [clientRows] = await pool.query('SELECT points FROM clients WHERE id = ? AND entreprise_id = ?', [clientId, empresaId]);
    if (clientRows.length === 0) return res.status(404).json({ error: 'Client non trouvé' });
    const newPoints = Math.max(0, (Number(clientRows[0].points) || 0) + Number(adjustment));
    await pool.query('UPDATE clients SET points = ? WHERE id = ?', [newPoints, clientId]);
    const [wallets] = await pool.query('SELECT id, pass_serial_number FROM wallet_cards WHERE client_id = ?', [clientId]);
    for (const w of wallets) {
      await pool.query('UPDATE wallet_cards SET points_balance = ? WHERE id = ?', [newPoints, w.id]);
      if (w.pass_serial_number && !w.pass_serial_number.startsWith('GOOGLE_')) {
        const [regs] = await pool.query('SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?', [w.pass_serial_number]);
        if (regs.length > 0) await apnService.sendBulkUpdateNotifications(regs.map(r => r.push_token));
      } else if (w.pass_serial_number && w.pass_serial_number.startsWith('GOOGLE_')) {
        await googleWalletGenerator.updateLoyaltyPoints(clientId, newPoints);
      }
    }
    await sendLoyaltyUpdateNotification(clientId, empresaId, adjustment, false);
    res.json({ success: true, newPoints });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const logoutProDevice = async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE entreprise_id = ? AND device_id = ?', [req.user.id, req.user.deviceId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const logoutProAll = async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE entreprise_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getProInfo = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nom, email, statut, loyalty_type FROM entreprises WHERE id = ?', [req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const changePassword = async (req, res) => {
  const { newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE entreprises SET mot_de_passe = ?, must_change_password = FALSE WHERE id = ?', [hashedPassword, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const deleteClient = async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = ? AND entreprise_id = ?', [req.params.clientId, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// Admin Controllers
export const adminLogin = async (req, res) => { /* Non implémenté ici car non critique pour Dashboard Pro */ };
export const getEnterprises = async (req, res) => { /* ... */ };
export const createCompany = async (req, res) => { /* ... */ };
