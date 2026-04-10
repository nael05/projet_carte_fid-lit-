import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
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
      'SELECT id, nom, email, statut, loyalty_type, temporary_password, must_change_password, created_at FROM entreprises ORDER BY created_at DESC'
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
  const { nom, email, loyalty_type = 'points' } = req.body;

  if (!nom || !email) {
    return res.status(400).json({ error: 'Nom et email requis' });
  }

  if (!['points', 'stamps'].includes(loyalty_type)) {
    return res.status(400).json({ error: 'Type de fidélité invalide (points ou stamps)' });
  }

  try {
    const companyId = uuidv4();
    const tempPassword = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      'INSERT INTO entreprises (id, nom, email, mot_de_passe, temporary_password, must_change_password, statut, loyalty_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [companyId, nom, email, hashedPassword, tempPassword, true, 'actif', loyalty_type]
    );

    // Créer la configuration de fidélité initiale
    const configId = uuidv4();
    await pool.query(
      `INSERT INTO loyalty_config (
        id, entreprise_id, loyalty_type, reward_title, reward_description
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        configId, companyId, loyalty_type,
        'Récompense spéciale',
        loyalty_type === 'points' 
          ? 'Vous avez atteint le nombre de points requis!' 
          : 'Tous vos tampons sont remplis!'
      ]
    );

    res.json({
      success: true,
      companyId,
      email,
      temporaryPassword: tempPassword,
      loyalty_type: loyalty_type,
      message: `Entreprise créée avec succès (Mode: ${loyalty_type})`
    });
  } catch (err) {
    logger.error('Create company error', { error: err.message });
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
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
    // Vérifier qu'il n'y a pas de clients actifs
    const [clientRows] = await pool.query(
      'SELECT COUNT(*) as count FROM clients WHERE entreprise_id = ?',
      [companyId]
    );

    if (clientRows[0].count > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer: des clients existent' 
      });
    }

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

    // 🔐 Vérification 4: Invalider toutes les sessions existantes (sauf le token courant)
    // Optionnel: DELETE des sessions ou ajouter une version de session
    // await pool.query(
    //   'DELETE FROM sessions WHERE entreprise_id = ? AND token != ?',
    //   [empresaId, req.headers.authorization.split(' ')[1]]
    // );

    // UPDATE: changer le mot de passe et mettre must_change_password à FALSE
    const [updateResult] = await pool.query(
      'UPDATE entreprises SET mot_de_passe = ?, must_change_password = FALSE WHERE id = ?',
      [hashedPassword, empresaId]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(500).json({ error: 'Impossible de mettre à jour le mot de passe' });
    }

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
      `SELECT e.id, e.nom, e.email, e.recompense_definition, e.loyalty_type,
              lc.points_per_purchase, lc.points_for_reward,
              lc.stamps_count, lc.stamps_per_purchase, lc.stamps_for_reward,
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
    // S'assurer que les valeurs numériques sont bien des nombres
    const safeProInfo = {
      ...proInfo,
      points_per_purchase: Number(proInfo.points_per_purchase || 0),
      points_for_reward: Number(proInfo.points_for_reward || 10),
      stamps_count: Number(proInfo.stamps_count || 10),
      stamps_per_purchase: Number(proInfo.stamps_per_purchase || 1),
      stamps_for_reward: Number(proInfo.stamps_for_reward || 10),
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

    if (loyaltyType === 'points') {
      const [rows] = await pool.query(
        `SELECT c.id, c.nom, c.prenom, c.telephone, c.points, c.type_wallet,
                (SELECT COUNT(*) FROM apple_pass_registrations r 
                 JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number 
                 WHERE w.client_id = c.id) as device_count
         FROM clients c 
         WHERE c.entreprise_id = ? 
         ORDER BY c.created_at DESC`,
        [empresaId]
      );
      res.json(rows);
    } else {
      // Pour les tampons, joindre avec la table customer_stamps
      const [rows] = await pool.query(
        `SELECT c.id, c.nom, c.prenom, c.telephone, c.type_wallet,
                COALESCE(cs.stamps_collected, 0) as stamps_collected,
                COALESCE(cs.stamps_redeemed, 0) as stamps_redeemed,
                (SELECT COUNT(*) FROM apple_pass_registrations r 
                 JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number 
                 WHERE w.client_id = c.id) as device_count
         FROM clients c
         LEFT JOIN customer_stamps cs ON c.id = cs.client_id AND cs.entreprise_id = c.entreprise_id
         WHERE c.entreprise_id = ? 
         ORDER BY c.created_at DESC`,
        [empresaId]
      );
      res.json(rows);
    }
  } catch (err) {
    logger.error('Get clients error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const handleScan = async (req, res) => {
  const { clientId } = req.body;
  const empresaId = req.user.id;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId requis' });
  }

  try {
    // Vérifier que le client appartient bien à cette entreprise (isolation des données)
    const [clientRows] = await pool.query(
      'SELECT nom, prenom, points FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé ou non autorisé' });
    }

    // Obtenir la configuration de fidélité
    const [config] = await pool.query(
      'SELECT loyalty_type, points_per_purchase, points_for_reward, stamps_per_purchase, stamps_for_reward, reward_title FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );

    if (config.length === 0) {
      return res.status(400).json({ error: 'Configuration de fidélité non trouvée' });
    }

    const loyaltyConfig = config[0];
    const loyaltyType = loyaltyConfig.loyalty_type;
    const response = {
      clientName: `${clientRows[0].prenom} ${clientRows[0].nom}`,
      rewardTitle: loyaltyConfig.reward_title
    };

    if (loyaltyType === 'points') {
      // Incrémenter les points
      const pointsToAdd = loyaltyConfig.points_per_purchase || 1;
      const pointsForReward = loyaltyConfig.points_for_reward || 10;
      
      const currentPoints = clientRows[0].points || 0;
      let newPoints = currentPoints + pointsToAdd;
      let rewardReached = false;

      // Vérifier si le palier de récompense est atteint
      if (newPoints >= pointsForReward) {
        rewardReached = true;
        newPoints = newPoints % pointsForReward; // Reset au surplus (souvent 0)
      }

      // Mettre à jour les points du client
      await pool.query(
        'UPDATE clients SET points = ? WHERE id = ? AND entreprise_id = ?',
        [newPoints, clientId, empresaId]
      );

      // Enregistrer la transaction
      const transactionId = uuidv4();
      await pool.query(
        `INSERT INTO transaction_history (id, client_id, entreprise_id, type, points_change, description)
         VALUES (?, ?, ?, 'add_points', ?, ?)`,
        [transactionId, clientId, empresaId, pointsToAdd, `${pointsToAdd} point(s) ajouté(s)`]
      );

      if (rewardReached) {
        // Enregistrer la transaction de récompense
        const rewardTransactionId = uuidv4();
        await pool.query(
          `INSERT INTO transaction_history (id, client_id, entreprise_id, type, description)
           VALUES (?, ?, ?, 'reward_unlocked', ?)`,
          [rewardTransactionId, clientId, empresaId, `Récompense atteinte: ${loyaltyConfig.reward_title}`]
        );
      }

      response.newPoints = newPoints;
      response.success = true;
      response.rewardUnlocked = rewardReached;
      response.message = rewardReached 
        ? `Palier atteint ! (${loyaltyConfig.reward_title})`
        : `${pointsToAdd} point(s) ajouté(s)! (Total: ${newPoints})`;

      // 📱 Mise à jour Apple Wallet (Points)
      try {
        const [walletRows] = await pool.query(
          'SELECT id, pass_serial_number FROM wallet_cards WHERE client_id = ? AND company_id = ?',
          [clientId, empresaId]
        );

        if (walletRows.length > 0) {
          const wallet = walletRows[0];
          
          // Mettre à jour le solde dans wallet_cards
          await pool.query(
            'UPDATE wallet_cards SET points_balance = ?, last_updated = NOW() WHERE id = ?',
            [newPoints, wallet.id]
          );

          // Log de mise à jour du pass
          await pool.query(
            `INSERT INTO pass_update_logs (
              wallet_card_id, pass_serial_number, action, value, old_balance, new_balance, description, triggered_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [wallet.id, wallet.pass_serial_number, rewardReached ? 'reward_reset' : 'add_points', pointsToAdd, currentPoints, newPoints, rewardReached ? 'Récompense et Reset' : 'Scan QR Code', 'pro_scan']
          );

          // Récupérer les tokens d'enregistrement
          const [registrations] = await pool.query(
            'SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?',
            [wallet.pass_serial_number]
          );

          if (registrations.length > 0) {
            const pushTokens = registrations.map(r => r.push_token);
            
            if (rewardReached) {
              // Notification d'alerte (Visible) pour la récompense
              for (const token of pushTokens) {
                await apnService.sendAlertNotification(
                  token, 
                  "Félicitations ! 🎁", 
                  `Vous avez gagné votre récompense : ${loyaltyConfig.reward_title}`,
                  { action: 'reward', company: response.clientName }
                );
              }
            } else {
              // Mise à jour silencieuse pour changer le score sur la carte
              await apnService.sendBulkUpdateNotifications(pushTokens);
            }
            logger.info(`📱 Notification push envoyée pour scan (client: ${clientId}, reward: ${rewardReached})`);
          }
        }
      } catch (walletErr) {
        logger.error('Erreur mise à jour wallet après scan (points):', walletErr.message);
        // On ne bloque pas le retour success car les points DB sont ok
      }

    } else if (loyaltyType === 'stamps') {
      // Ajouter des tampons
      const stampsToAdd = loyaltyConfig.stamps_per_purchase || 1;
      
      // Obtenir ou créer les tampons du client
      const [stampRows] = await pool.query(
        'SELECT id, stamps_collected FROM customer_stamps WHERE client_id = ? AND entreprise_id = ?',
        [clientId, empresaId]
      );

      if (stampRows.length === 0) {
        // Créer l'entrée des tampons
        const stampId = uuidv4();
        await pool.query(
          'INSERT INTO customer_stamps (id, client_id, entreprise_id, stamps_collected) VALUES (?, ?, ?, ?)',
          [stampId, clientId, empresaId, stampsToAdd]
        );
      } else {
        // Ajouter aux tampons existants
        await pool.query(
          'UPDATE customer_stamps SET stamps_collected = stamps_collected + ? WHERE client_id = ? AND entreprise_id = ?',
          [stampsToAdd, clientId, empresaId]
        );
      }

      // Enregistrer la transaction
      const transactionId = uuidv4();
      await pool.query(
        `INSERT INTO transaction_history (id, client_id, entreprise_id, type, stamps_change, description)
         VALUES (?, ?, ?, 'add_stamps', ?, ?)`,
        [transactionId, clientId, empresaId, stampsToAdd, `${stampsToAdd} tampon(s) ajouté(s)`]
      );

      // Récupérer l'état actuel après ajout
      const [updatedStamps] = await pool.query(
        'SELECT stamps_collected FROM customer_stamps WHERE client_id = ? AND entreprise_id = ?',
        [clientId, empresaId]
      );

      let newStamps = Number(updatedStamps[0].stamps_collected || 0);
      const stampsForReward = Number(loyaltyConfig.stamps_for_reward || 10);
      let rewardReached = false;

      // Vérifier si le palier de récompense est atteint
      if (newStamps >= stampsForReward) {
        rewardReached = true;
        newStamps = 0; // Reset à 0
        
        // Mettre à jour au solde 0 en base
        await pool.query(
          'UPDATE customer_stamps SET stamps_collected = 0 WHERE client_id = ? AND entreprise_id = ?',
          [clientId, empresaId]
        );

        // Enregistrer la transaction de récompense
        const rewardTransactionId = uuidv4();
        await pool.query(
          `INSERT INTO transaction_history (id, client_id, entreprise_id, type, description)
           VALUES (?, ?, ?, 'reward_claimed', ?)`,
          [rewardTransactionId, clientId, empresaId, `Récompense atteinte et Reset : ${loyaltyConfig.reward_title}`]
        );
      }

      response.newStamps = newStamps;
      response.success = true;
      response.rewardUnlocked = rewardReached;
      response.message = rewardReached 
        ? `Palier atteint ! (${loyaltyConfig.reward_title})`
        : `${stampsToAdd} tampon(s) ajouté(s)! (Total: ${newStamps})`;

      // 📱 Mise à jour Apple Wallet (Stamps)
      try {
        const [walletRows] = await pool.query(
          'SELECT id, pass_serial_number FROM wallet_cards WHERE client_id = ? AND company_id = ?',
          [clientId, empresaId]
        );

        if (walletRows.length > 0) {
          const wallet = walletRows[0];
          
          // Mettre à jour le solde dans wallet_cards
          await pool.query(
            'UPDATE wallet_cards SET stamps_balance = ?, last_updated = NOW() WHERE id = ?',
            [newStamps, wallet.id]
          );

          // Log de mise à jour du pass
          await pool.query(
            `INSERT INTO pass_update_logs (
              wallet_card_id, pass_serial_number, action, value, old_balance, new_balance, description, triggered_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [wallet.id, wallet.pass_serial_number, rewardReached ? 'reward_reset' : 'add_stamps', stampsToAdd, rewardReached ? stampsForReward : (newStamps - stampsToAdd), newStamps, rewardReached ? 'Récompense et Reset' : 'Scan QR Code', 'pro_scan']
          );

          // Envoyer les notifications push
          const [registrations] = await pool.query(
            'SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?',
            [wallet.pass_serial_number]
          );

          if (registrations.length > 0) {
            const pushTokens = registrations.map(r => r.push_token);
            
            if (rewardReached) {
              // Notification d'alerte (Visible)
              for (const token of pushTokens) {
                await apnService.sendAlertNotification(
                  token, 
                  "Félicitations ! 🎁", 
                  `Vous avez gagné votre récompense : ${loyaltyConfig.reward_title}`,
                  { action: 'reward', company: response.clientName }
                );
              }
            } else {
              // Mise à jour silencieuse
              await apnService.sendBulkUpdateNotifications(pushTokens);
            }
            logger.info(`📱 Push envoyé pour scan stamps (client: ${clientId}, reward: ${rewardReached})`);
          }
        }
      } catch (walletErr) {
        logger.error('Erreur mise à jour wallet après scan (stamps):', walletErr.message);
      }
    }

    res.json(response);
  } catch (err) {
    logger.error('Handle scan error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const adjustPoints = async (req, res) => {
  const { clientId } = req.params;
  const { adjustment } = req.body;
  const empresaId = req.user.id;

  if (typeof adjustment !== 'number') {
    return res.status(400).json({ error: 'Ajustement numérique requis' });
  }

  try {
    // 1️⃣ Récupérer la config et les données actuelles (points ou tampons)
    const [clientRows] = await pool.query(
      `SELECT c.points, cs.stamps_collected, e.loyalty_type, e.nom as company_name
       FROM clients c
       LEFT JOIN entreprises e ON c.entreprise_id = e.id
       LEFT JOIN customer_stamps cs ON cs.client_id = c.id AND cs.entreprise_id = c.entreprise_id
       WHERE c.id = ? AND c.entreprise_id = ?`,
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé ou non autorisé' });
    }

    const { points, stamps_collected, loyalty_type } = clientRows[0];
    let newBalance = 0;
    let balanceField = '';
    let rewardReached = false;
    let rewardTitle = '';

    // Récupérer la config pour le seuil
    const [configRows] = await pool.query(
      'SELECT points_for_reward, stamps_for_reward, reward_title FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );
    const config = configRows[0] || { points_for_reward: 10, stamps_for_reward: 10, reward_title: 'Cadeau' };
    rewardTitle = config.reward_title;

    if (loyalty_type === 'stamps') {
      // Ajustement des TAMPONS
      const threshold = Number(config.stamps_for_reward || 10);
      newBalance = Number(stamps_collected || 0) + Number(adjustment);
      
      if (newBalance >= threshold && adjustment > 0) {
        rewardReached = true;
        newBalance = 0; // Reset à 0
      } else {
        newBalance = Math.max(0, newBalance);
      }
      
      balanceField = 'stamps_balance';

      // Mettre à jour customer_stamps
      const [stampExists] = await pool.query('SELECT id FROM customer_stamps WHERE client_id = ? AND entreprise_id = ?', [clientId, empresaId]);
      if (stampExists.length === 0) {
        await pool.query(
          'INSERT INTO customer_stamps (id, client_id, entreprise_id, stamps_collected) VALUES (?, ?, ?, ?)',
          [uuidv4(), clientId, empresaId, newBalance]
        );
      } else {
        await pool.query('UPDATE customer_stamps SET stamps_collected = ? WHERE client_id = ? AND entreprise_id = ?', [newBalance, clientId, empresaId]);
      }
    } else {
      // Ajustement des POINTS
      const threshold = Number(config.points_for_reward || 10);
      newBalance = Number(points || 0) + Number(adjustment);

      if (newBalance >= threshold && adjustment > 0) {
        rewardReached = true;
        newBalance = 0; // Reset à 0
      } else {
        newBalance = Math.max(0, newBalance);
      }

      balanceField = 'points_balance';

      await pool.query(
        'UPDATE clients SET points = ? WHERE id = ? AND entreprise_id = ?',
        [newBalance, clientId, empresaId]
      );
    }

    // 2️⃣ Mettre à jour Apple Wallet
    try {
      const [walletRows] = await pool.query(
        'SELECT id, pass_serial_number FROM wallet_cards WHERE client_id = ? AND company_id = ?',
        [clientId, empresaId]
      );

      if (walletRows.length > 0) {
        const wallet = walletRows[0];
        
        await pool.query(
          `UPDATE wallet_cards SET ${balanceField} = ?, last_updated = NOW() WHERE id = ?`,
          [newBalance, wallet.id]
        );

        // Log de mise à jour
        await pool.query(
          `INSERT INTO pass_update_logs (
            wallet_card_id, pass_serial_number, action, value, old_balance, new_balance, description, triggered_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            wallet.id, 
            wallet.pass_serial_number, 
            rewardReached ? 'reward_reset' : (adjustment > 0 ? 'add_manual' : 'remove_manual'), 
            adjustment, 
            rewardReached ? (loyalty_type === 'stamps' ? stamps_collected : points) : (newBalance - adjustment), 
            newBalance, 
            rewardReached ? `Récompense atteinte et Reset : ${rewardTitle}` : 'Ajustement manuel par le pro', 
            'pro_adjust'
          ]
        );

        // Envoyer les notifications push
        const [registrations] = await pool.query(
          'SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?',
          [wallet.pass_serial_number]
        );

        if (registrations.length > 0) {
          const pushTokens = registrations.map(r => r.push_token);
          
          if (rewardReached) {
            // Notification d'alerte (Visible) pour la récompense
            for (const token of pushTokens) {
                await apnService.sendAlertNotification(
                  token, 
                  "Félicitations ! 🎁", 
                  `Vous avez gagné votre récompense : ${rewardTitle}`,
                  { action: 'reward', company: clientRows[0].company_name }
                );
            }
          } else {
            // Mise à jour silencieuse
            await apnService.sendBulkUpdateNotifications(pushTokens);
          }
          logger.info(`📱 Push envoyé pour ajustement manuel (${loyalty_type}, reward: ${rewardReached})`);
        }
      }
    } catch (walletErr) {
      logger.error('Erreur mise à jour wallet après ajustement:', walletErr.message);
    }

    res.json({ success: true, newBalance, loyalty_type, message: 'Balance mise à jour' });
  } catch (err) {
    logger.error('Adjust balance error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const updateReward = async (req, res) => {
  const { recompense_definition } = req.body;
  const empresaId = req.user.id;

  if (!recompense_definition) {
    return res.status(400).json({ error: 'Texte de récompense requis' });
  }

  try {
    await pool.query(
      'UPDATE entreprises SET recompense_definition = ? WHERE id = ?',
      [recompense_definition, empresaId]
    );

    res.json({ success: true, message: 'Récompense mise à jour' });
  } catch (err) {
    logger.error('Update reward error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ===== PUBLIC CLIENT ROUTES =====

export const getCompanyInfo = async (req, res) => {
  const { companyId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT 
        e.id, 
        e.nom, 
        e.recompense_definition,
        COALESCE(lc.loyalty_type, 'points') as loyalty_type
       FROM entreprises e
       LEFT JOIN loyalty_config lc ON e.id = lc.entreprise_id
       WHERE e.id = ? AND e.statut = "actif"`,
      [companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée ou inactive' });
    }

    res.json(rows[0]);
  } catch (err) {
    logger.error('Get company info error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const registerClientAndGeneratePass = async (req, res) => {
  const { entrepriseId } = req.params;
  const { nom, prenom, telephone, type_wallet } = req.body;

  if (!nom || !prenom || !telephone || !type_wallet) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  if (!['apple', 'google'].includes(type_wallet)) {
    return res.status(400).json({ error: 'Type de wallet invalide' });
  }

  try {
    // Vérifier que l'entreprise existe, récupérer son info ET le type de loyauté
    const [companyRows] = await pool.query(
      `SELECT e.id, e.nom, COALESCE(lc.loyalty_type, 'points') as loyalty_type
       FROM entreprises e
       LEFT JOIN loyalty_config lc ON e.id = lc.entreprise_id
       WHERE e.id = ? AND e.statut = "actif"`,
      [entrepriseId]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée ou inactive' });
    }

    const companyName = companyRows[0].nom;
    const loyaltyType = companyRows[0].loyalty_type || 'points';

    // Créer le client avec un UUID unique
    const clientId = uuidv4();

    await pool.query(
      'INSERT INTO clients (id, entreprise_id, nom, prenom, telephone, points, type_wallet) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [clientId, entrepriseId, nom, prenom, telephone, type_wallet]
    );
    
    logger.info(`✅ Client créé: ${clientId} - ${prenom} ${nom}`);

    // Charger la customization de la carte pour ce type de loyauté
    const [customization] = await pool.query(
      'SELECT * FROM card_customization WHERE company_id = ? AND loyalty_type = ?',
      [entrepriseId, loyaltyType]
    );

    const cardConfig = customization.length > 0 ? customization[0] : {
      card_background_color: '#1f2937',
      card_text_color: '#ffffff',
      card_accent_color: '#3b82f6',
      card_logo_url: null
    };

    // Wallet generation a été refactorisé dans les nouveaux controllers (walletAppController)
    res.status(201).json({
      success: true,
      clientId,
      message: 'Client créé avec succès',
      note: 'Pour ajouter au wallet, utiliser POST /api/app/wallet/create'
    });
  } catch (err) {
    logger.error('Register client error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ===== CARD CUSTOMIZATION CONTROLLERS =====

export const getCardCustomization = async (req, res) => {
  const { empresaId } = req.params;
  const { loyaltyType } = req.query;

  try {
    if (!loyaltyType || !['points', 'stamps'].includes(loyaltyType)) {
      return res.status(400).json({ error: 'loyaltyType invalide' });
    }

    const [customization] = await pool.query(
      'SELECT * FROM card_customization WHERE company_id = ? AND loyalty_type = ?',
      [empresaId, loyaltyType]
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
        footer_text: ''
      });
    }

    res.json(customization[0]);
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
    apple_organization_name,
    apple_pass_description
  } = req.body;

  try {
    if (!loyaltyType || !['points', 'stamps'].includes(loyaltyType)) {
      return res.status(400).json({ error: 'loyaltyType invalide' });
    }

    // Vérifier si la personnalisation existe pour ce type
    const [existing] = await pool.query(
      'SELECT id FROM card_customization WHERE company_id = ? AND loyalty_type = ?',
      [empresaId, loyaltyType]
    );

    if (existing.length === 0) {
      // Créer une nouvelle entrée
      const customizationId = uuidv4();
      await pool.query(
        `INSERT INTO card_customization 
         (id, company_id, loyalty_type, primary_color, text_color, accent_color, secondary_color,
          logo_url, icon_url, strip_image_url, logo_text, card_subtitle, card_title,
          back_fields_info, back_fields_terms, back_fields_website, apple_organization_name, apple_pass_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customizationId,
          empresaId,
          loyaltyType,
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
          apple_organization_name || null,
          apple_pass_description || null
        ]
      );
    } else {
      // Mettre à jour l'entrée existante
      await pool.query(
        `UPDATE card_customization SET 
         primary_color = ?, text_color = ?, accent_color = ?, secondary_color = ?,
         logo_url = ?, icon_url = ?, strip_image_url = ?, logo_text = ?, 
         card_subtitle = ?, card_title = ?, 
         back_fields_info = ?, back_fields_terms = ?, back_fields_website = ?,
         apple_organization_name = ?, apple_pass_description = ?,
         updated_at = NOW()
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
          apple_organization_name || null,
          apple_pass_description || null,
          empresaId,
          loyaltyType
        ]
      );
    }

    res.json({
      success: true,
      message: `Personnalisation ${loyaltyType} mise à jour avec succès`
    });
  } catch (err) {
    logger.error('Update card customization error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const uploadLogo = async (req, res) => {
  const { imageType } = req.query; // 'logo', 'icon', 'strip'

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }
    
    const tempPath = req.file.path;
    const finalFilename = req.file.filename + '-resized.png';
    const finalPath = path.join(req.file.destination, finalFilename);
    
    // Define sizes based on type
    let resizeOpts = { width: 160, height: 50, fit: 'inside' };
    if (imageType === 'icon') {
      resizeOpts = { width: 29, height: 29, fit: 'cover' };
    } else if (imageType === 'strip') {
      resizeOpts = { width: 375, height: 123, fit: 'cover' };
    }
    
    await sharp(tempPath)
      .resize({ ...resizeOpts, withoutEnlargement: true })
      .png()
      .toFile(finalPath);
      
    fs.unlinkSync(tempPath);

    let domain = req.get('host');
    let protocol = domain && domain.includes('loca.lt') ? 'https' : req.protocol;
    const fileUrl = `${protocol}://${domain}/uploads/${finalFilename}`;
    
    res.json({ success: true, url: fileUrl });
  } catch (err) {
    logger.error('Upload image error', { error: err.message });
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
