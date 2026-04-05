import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../middlewares/auth.js';
import { createSession, generateDeviceFingerprint } from '../utils/sessionManager.js';
import pool from '../db.js';
import { PKPass } from 'passkit-generator';
import * as fs from 'fs';
import * as path from 'path';
import googleWalletManager from '../utils/googleWalletManager.js';
import { validatePassword, validatePasswordChange } from '../utils/passwordValidator.js';

// ===== MASTER ADMIN CONTROLLERS =====

export const adminLogin = async (req, res) => {
  const { identifiant, mot_de_passe } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM super_admins WHERE identifiant = ?',
      [identifiant]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const admin = rows[0];
    const isPasswordValid = await bcrypt.compare(mot_de_passe, admin.mot_de_passe);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = generateToken(admin.id, 'admin');
    res.json({ token, message: 'Connecté' });
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const suspendCompany = async (req, res) => {
  const { companyId } = req.params;

  try {
    console.log('🔴 [SUSPEND] Demande reçue pour companyId:', companyId);
    console.log('🔴 [SUSPEND] Admin ID:', req.user?.id, 'Role:', req.user?.role);

    const [result] = await pool.query(
      'UPDATE entreprises SET statut = "suspendu" WHERE id = ?',
      [companyId]
    );

    console.log('🔴 [SUSPEND] Résultat UPDATE:', { affectedRows: result.affectedRows });

    if (result.affectedRows === 0) {
      console.log('🔴 [SUSPEND] ❌ Entreprise non trouvée avec ID:', companyId);
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    console.log('🔴 [SUSPEND] ✅ Entreprise suspendue avec succès');
    res.json({ success: true, message: 'Entreprise suspendue' });
  } catch (err) {
    console.error('🔴 [SUSPEND] ❌ Erreur SQL:', err.message);
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
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

    res.json({ success: true, message: 'Entreprise réactivée' });
  } catch (err) {
    console.error(err);
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

    res.json({ success: true, message: 'Entreprise supprimée (suppression en cascade des clients)' });
  } catch (err) {
    console.error(err);
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
      console.log(`⚠️ Première connexion de l'entreprise: ${company.nom} (${company.id})`);
      console.log(`   → Changement de mot de passe obligatoire`);
    }
    
    // Créer la session (valide 24h) - optionnel, ne bloque pas le login
    try {
      await createSession(company.id, deviceFingerprint, deviceName, token, '24h');
      console.log('✅ Session créée pour:', company.id);
    } catch (sessionErr) {
      console.error('⚠️ Erreur création session (non bloquant):', sessionErr.message);
      // La session est optionnelle - on continue quand même
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
    console.error('❌ Erreur proLogin:', err.message, err.stack);
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
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

    console.log(`✅ Mot de passe changé pour l'entreprise: ${empresaId}`);

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès',
      mustChangePassword: false
    });
  } catch (err) {
    console.error('❌ Erreur changePassword:', err.message, err.stack);
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
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

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 🆕 Récupérer toutes les sessions actives de l'entreprise
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
    console.error(err);
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
    console.error(err);
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
    console.error(err);
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
        'SELECT id, nom, prenom, telephone, points, type_wallet FROM clients WHERE entreprise_id = ? ORDER BY created_at DESC',
        [empresaId]
      );
      res.json(rows);
    } else {
      // Pour les tampons, joindre avec la table customer_stamps
      const [rows] = await pool.query(
        `SELECT c.id, c.nom, c.prenom, c.telephone, c.type_wallet,
                COALESCE(cs.stamps_collected, 0) as stamps_collected,
                COALESCE(cs.stamps_redeemed, 0) as stamps_redeemed
         FROM clients c
         LEFT JOIN customer_stamps cs ON c.id = cs.client_id
         WHERE c.entreprise_id = ? 
         ORDER BY c.created_at DESC`,
        [empresaId]
      );
      res.json(rows);
    }
  } catch (err) {
    console.error(err);
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
      
      await pool.query(
        'UPDATE clients SET points = points + ? WHERE id = ? AND entreprise_id = ?',
        [pointsToAdd, clientId, empresaId]
      );

      // Enregistrer la transaction
      const transactionId = uuidv4();
      await pool.query(
        `INSERT INTO transaction_history (id, client_id, entreprise_id, type, points_change, description)
         VALUES (?, ?, ?, 'points_added', ?, ?)`,
        [transactionId, clientId, empresaId, pointsToAdd, `${pointsToAdd} point(s) ajouté(s)`]
      );

      // Récupérer le nouveau solde
      const [updatedClient] = await pool.query(
        'SELECT points FROM clients WHERE id = ?',
        [clientId]
      );

      const newPoints = updatedClient[0].points;
      response.newPoints = newPoints;
      response.success = true;
      response.message = `${pointsToAdd} point(s) ajouté(s)! (Total: ${newPoints})`;

      // Vérifier si le palier de récompense est atteint
      const pointsForReward = loyaltyConfig.points_for_reward;
      if (newPoints % pointsForReward === 0) {
        response.rewardUnlocked = true;
        response.rewardText = loyaltyConfig.reward_title;
        
        // Enregistrer la transaction de récompense
        const rewardTransactionId = uuidv4();
        await pool.query(
          `INSERT INTO transaction_history (id, client_id, entreprise_id, type, description)
           VALUES (?, ?, ?, 'reward_claimed', ?)`,
          [rewardTransactionId, clientId, empresaId, 'Récompense atteinte']
        );
      }

    } else if (loyaltyType === 'stamps') {
      // Ajouter des tampons
      const stampsToAdd = loyaltyConfig.stamps_per_purchase || 1;
      
      // Obtenir ou créer les tampons du client
      const [stampRows] = await pool.query(
        'SELECT id, stamps_collected FROM customer_stamps WHERE client_id = ?',
        [clientId]
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
          'UPDATE customer_stamps SET stamps_collected = stamps_collected + ? WHERE client_id = ?',
          [stampsToAdd, clientId]
        );
      }

      // Enregistrer la transaction
      const transactionId = uuidv4();
      await pool.query(
        `INSERT INTO transaction_history (id, client_id, entreprise_id, type, stamps_change, description)
         VALUES (?, ?, ?, 'stamps_added', ?, ?)`,
        [transactionId, clientId, empresaId, stampsToAdd, `${stampsToAdd} tampon(s) ajouté(s)`]
      );

      // Récupérer l'état actuel
      const [updatedStamps] = await pool.query(
        'SELECT stamps_collected FROM customer_stamps WHERE client_id = ?',
        [clientId]
      );

      const newStamps = updatedStamps[0].stamps_collected;
      response.newStamps = newStamps;
      response.success = true;
      response.message = `${stampsToAdd} tampon(s) ajouté(s)! (Total: ${newStamps})`;

      // Vérifier si le palier de récompense est atteint
      const stampsForReward = loyaltyConfig.stamps_for_reward;
      if (newStamps >= stampsForReward && newStamps % stampsForReward === 0) {
        response.rewardUnlocked = true;
        response.rewardText = loyaltyConfig.reward_title;
        
        // Enregistrer la transaction de récompense
        const rewardTransactionId = uuidv4();
        await pool.query(
          `INSERT INTO transaction_history (id, client_id, entreprise_id, type, description)
           VALUES (?, ?, ?, 'reward_claimed', ?)`,
          [rewardTransactionId, clientId, empresaId, 'Récompense atteinte']
        );
      }
    }

    res.json(response);
  } catch (err) {
    console.error(err);
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
    // Vérifier que le client appartient à cette entreprise
    const [clientRows] = await pool.query(
      'SELECT points FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non autorisé' });
    }

    const newPoints = Math.max(0, clientRows[0].points + adjustment);

    await pool.query(
      'UPDATE clients SET points = ? WHERE id = ? AND entreprise_id = ?',
      [newPoints, clientId, empresaId]
    );

    res.json({ success: true, newPoints, message: 'Points ajustés' });
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    console.error(err);
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

    // Générer le pass (pkpass pour Apple Wallet)
    if (type_wallet === 'apple') {
      try {
        const pass = new PKPass(
          {
            model: path.join(process.cwd(), 'passes/loyalty.pass'),
            certificates: {
              wwdr: fs.readFileSync(path.join(process.cwd(), 'certs/wwdr.pem')),
              signingCert: fs.readFileSync(path.join(process.cwd(), 'certs/signingCert.p12')),
              signingKey: fs.readFileSync(path.join(process.cwd(), 'certs/signingKey.key'))
            },
            signingKeyPassphrase: process.env.APPLE_CERT_PASSWORD || 'password'
          },
          {
            serialNumber: clientId,
            description: `${companyName} - Carte de Fidélité`,
            formatVersion: 1,
            organizationName: companyName,
            passTypeIdentifier: `pass.com.example.loyalty.${clientId}`,
            teamIdentifier: process.env.APPLE_TEAM_ID || 'TEAMID',
            barcodes: [
              {
                format: 'PKBarcodeFormatQR',
                message: clientId,
                messageEncoding: 'iso-8859-1'
              }
            ],
            backgroundColor: cardConfig.card_background_color || '#1f2937',
            foregroundColor: cardConfig.card_text_color || '#ffffff',
            stripColor: cardConfig.card_accent_color || '#3b82f6',
            generic: {
              primaryFields: [
                {
                  key: 'loyalty',
                  label: loyaltyType === 'points' ? 'Points' : 'Tampons',
                  value: '0'
                }
              ],
              secondaryFields: [
                {
                  key: 'name',
                  label: 'Titulaire',
                  value: `${prenom} ${nom}`
                }
              ]
            }
          }
        );

        const buffer = pass.getAsBuffer();
        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', `attachment; filename="${prenom}-${nom}-loyalty.pkpass"`);
        res.send(buffer);
      } catch (passErr) {
        console.error('Erreur génération pass Apple:', passErr);
        // Retourner quand même le clientId même si la génération échoue
        res.status(500).json({
          error: 'Erreur génération pass (certificats manquants)',
          clientId,
          message: 'Client créé mais pass ne peut pas être généré sans les certificats Apple'
        });
      }
    } else if (type_wallet === 'google') {
      // Pour Google Wallet, créer le pass via l'API Google
      try {
        const walletData = await googleWalletManager.createWalletPass(
          {
            id: clientId,
            nom,
            prenom,
            companyName
          },
          cardConfig,
          loyaltyType
        );

        res.json({
          success: true,
          clientId,
          walletsaveUrl: walletData.saveUrl,
          message: 'Pass Google Wallet généré avec succès',
          walletPass: {
            classId: walletData.classId,
            objectId: walletData.objectId,
            jwt: walletData.jwt
          }
        });
      } catch (googleErr) {
        console.error('Erreur génération Google Wallet:', googleErr.message);
        res.status(500).json({
          error: 'Erreur génération Google Wallet',
          clientId,
          message: `Client créé mais erreur génération pass: ${googleErr.message}`,
          fallbackMessage: 'Vous pouvez créer la carte manuellement dans Google Wallet'
        });
      }
    }
  } catch (err) {
    console.error(err);
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
        card_background_color: '#1f2937',
        card_text_color: '#ffffff',
        card_accent_color: '#3b82f6',
        card_border_radius: 12,
        card_logo_url: null,
        card_pattern: 'solid',
        font_family: 'Arial',
        show_company_name: true,
        show_loyalty_type: true,
        custom_message: '',
        card_design_template: 'classic',
        gradient_start: null,
        gradient_end: null,
        background_image_url: null,
        wallet_class_id: '',
        wallet_card_title: '',
        wallet_header_text: '',
        wallet_subtitle_text: '',
        wallet_barcode_text_template: 'ID: {clientId}',
        wallet_description_text: ''
      });
    }

    res.json(customization[0]);
  } catch (err) {
    console.error('Erreur chargement personnalisation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const updateCardCustomization = async (req, res) => {
  const { empresaId } = req.params;
  const { loyaltyType } = req.query;
  const {
    card_background_color,
    card_text_color,
    card_accent_color,
    card_border_radius,
    card_logo_url,
    card_pattern,
    font_family,
    show_company_name,
    show_loyalty_type,
    custom_message,
    card_design_template,
    gradient_start,
    gradient_end,
    background_image_url,
    // Google Wallet fields
    wallet_class_id,
    wallet_card_title,
    wallet_header_text,
    wallet_subtitle_text,
    wallet_barcode_text_template,
    wallet_description_text
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
      await pool.query(
        `INSERT INTO card_customization 
         (company_id, loyalty_type, card_background_color, card_text_color, card_accent_color, 
          card_border_radius, card_logo_url, card_pattern, font_family, 
          show_company_name, show_loyalty_type, custom_message, card_design_template,
          gradient_start, gradient_end, background_image_url,
          wallet_class_id, wallet_card_title, wallet_header_text, wallet_subtitle_text,
          wallet_barcode_text_template, wallet_description_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          empresaId,
          loyaltyType,
          card_background_color || '#1f2937',
          card_text_color || '#ffffff',
          card_accent_color || '#3b82f6',
          card_border_radius || 12,
          card_logo_url,
          card_pattern || 'solid',
          font_family || 'Arial',
          show_company_name !== false,
          show_loyalty_type !== false,
          custom_message || '',
          card_design_template || 'classic',
          gradient_start,
          gradient_end,
          background_image_url,
          wallet_class_id || '',
          wallet_card_title || '',
          wallet_header_text || '',
          wallet_subtitle_text || '',
          wallet_barcode_text_template || 'ID: {clientId}',
          wallet_description_text || ''
        ]
      );
    } else {
      // Mettre à jour l'entrée existante
      await pool.query(
        `UPDATE card_customization SET 
         card_background_color = ?, card_text_color = ?, card_accent_color = ?,
         card_border_radius = ?, card_logo_url = ?, card_pattern = ?, font_family = ?,
         show_company_name = ?, show_loyalty_type = ?, custom_message = ?,
         card_design_template = ?, gradient_start = ?, gradient_end = ?,
         background_image_url = ?, wallet_class_id = ?, wallet_card_title = ?,
         wallet_header_text = ?, wallet_subtitle_text = ?, wallet_barcode_text_template = ?,
         wallet_description_text = ?, updated_at = NOW()
         WHERE company_id = ? AND loyalty_type = ?`,
        [
          card_background_color || '#1f2937',
          card_text_color || '#ffffff',
          card_accent_color || '#3b82f6',
          card_border_radius || 12,
          card_logo_url,
          card_pattern || 'solid',
          font_family || 'Arial',
          show_company_name !== false,
          show_loyalty_type !== false,
          custom_message || '',
          card_design_template || 'classic',
          gradient_start,
          gradient_end,
          background_image_url,
          wallet_class_id || '',
          wallet_card_title || '',
          wallet_header_text || '',
          wallet_subtitle_text || '',
          wallet_barcode_text_template || 'ID: {clientId}',
          wallet_description_text || '',
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
    console.error('Erreur mise à jour personnalisation:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
