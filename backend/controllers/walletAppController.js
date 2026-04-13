import { randomUUID } from 'crypto';
import passGenerator from '../utils/passGenerator.js';
import googleWalletGenerator from '../utils/googleWalletGenerator.js';
import { apnService } from '../utils/apnService.js';
import { sendLoyaltyUpdateNotification } from '../utils/notificationService.js';
import db from '../db.js';
import logger from '../utils/logger.js';

export const createWalletPass = async (req, res) => {
  try {
    const { clientId, type_wallet: bodyWalletType } = req.body;
    const [clientRows] = await db.query(
      `SELECT c.id, c.prenom, c.nom, c.telephone, c.points, c.type_wallet, e.id as company_id, e.nom as company_name,
              cc.logo_url as apple_logo_url, cc.icon_url as apple_icon_url, cc.strip_image_url as apple_strip_image_url,
              cc.primary_color as apple_background_color, cc.text_color as apple_text_color, cc.accent_color as apple_label_color,
              cc.card_subtitle as apple_pass_description, cc.apple_organization_name, cc.logo_text
       FROM clients c LEFT JOIN entreprises e ON c.entreprise_id = e.id
       LEFT JOIN card_customization cc ON e.id = cc.company_id WHERE c.id = ?`,
      [clientId]
    );
    if (!clientRows.length) return res.status(404).json({ error: 'Client non trouvé' });
    const client = clientRows[0];
    const type_wallet = bodyWalletType || client.type_wallet || 'apple';
    
    if (type_wallet === 'google') {
      const [tiers] = await db.query('SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC', [client.company_id]);
      const saveUrl = await googleWalletGenerator.createLoyaltyObject(client.id, client.company_id, `${client.prenom} ${client.nom}`, client.points || 0, client, tiers);
      return res.json({ success: true, type: 'google', saveUrl });
    }

    const serialNumber = client.id.replace(/-/g, '').substring(0, 20).toUpperCase();
    const authenticationToken = randomUUID();
    const [tiers] = await db.query('SELECT * FROM reward_tiers WHERE entreprise_id = ? ORDER BY points_required ASC', [client.company_id]);
    
    const passBuffer = await passGenerator.generateLoyaltyPass(
      { clientId: client.id, firstName: client.prenom, lastName: client.nom, companyName: client.company_name, balance: client.points || 0, rewardTiers: tiers, qrCodeValue: client.id.toString() },
      client, serialNumber, authenticationToken
    );

    await db.query(`INSERT INTO wallet_cards (client_id, company_id, pass_serial_number, authentication_token, points_balance, qr_code_value) VALUES (?, ?, ?, ?, ?, ?)`,
      [client.id, client.company_id, serialNumber, authenticationToken, client.points || 0, client.id.toString()]);

    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.send(passBuffer);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const addPointsToWallet = async (req, res) => {
  try {
    const { clientId, pointsToAdd } = req.body;
    const [walletRows] = await db.query('SELECT wc.id, wc.pass_serial_number, c.entreprise_id FROM wallet_cards wc JOIN clients c ON wc.client_id = c.id WHERE wc.client_id = ?', [clientId]);
    if (!walletRows.length) return res.status(404).json({ error: 'No wallet' });
    const wallet = walletRows[0];
    const newBalance = (Number(pointsToAdd) || 0); 
    await db.query('UPDATE wallet_cards SET points_balance = ?, last_updated = NOW() WHERE id = ?', [newBalance, wallet.id]);
    
    const [registrations] = await db.query('SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?', [wallet.pass_serial_number]);
    if (registrations.length) await apnService.sendBulkUpdateNotifications(registrations.map(r => r.push_token));
    
    if (wallet.pass_serial_number.startsWith('GOOGLE_')) {
      await googleWalletGenerator.updateLoyaltyPoints(clientId, newBalance);
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getWalletStatus = async (req, res) => { /* ... */ };
export const downloadClientPass = async (req, res) => { /* ... */ };

export default { createWalletPass, addPointsToWallet, getWalletStatus, downloadClientPass };
