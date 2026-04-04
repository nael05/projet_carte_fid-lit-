import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../middlewares/auth.js';
import { createSession, generateDeviceFingerprint } from '../utils/sessionManager.js';
import pool from '../db.js';
import { PKPass } from 'passkit-generator';
import * as fs from 'fs';
import * as path from 'path';

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
      'SELECT id, nom, email, statut, created_at FROM entreprises ORDER BY created_at DESC'
    );

    res.json(enterprises);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const createCompany = async (req, res) => {
  const { nom, email } = req.body;

  if (!nom || !email) {
    return res.status(400).json({ error: 'Nom et email requis' });
  }

  try {
    const companyId = uuidv4();
    const tempPassword = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      'INSERT INTO entreprises (id, nom, email, mot_de_passe, must_change_password, statut) VALUES (?, ?, ?, ?, TRUE, "actif")',
      [companyId, nom, email, hashedPassword]
    );

    res.json({
      success: true,
      companyId,
      email,
      temporaryPassword: tempPassword,
      message: 'Entreprise créée avec succès'
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
    
    // 🆕 Générer une empreinte d'appareil unique
    const deviceFingerprint = generateDeviceFingerprint(req);
    const deviceName = req.headers['user-agent']?.substring(0, 100) || 'Unknown Device';
    
    // 🆕 Créer la session (valide 24h)
    try {
      await createSession(company.id, deviceFingerprint, deviceName, token, '24h');
      console.log('✅ Session créée pour:', company.id);
    } catch (sessionErr) {
      console.error('⚠️ Erreur création session:', sessionErr.message);
      // Continue anyway - session est optionnelle pour le login
    }

    res.json({
      token,
      deviceId: deviceFingerprint,  // ← Retourne le deviceId au frontend
      mustChangePassword: company.must_change_password,
      companyId: company.id,
      nom: company.nom,
      statut: company.statut
    });
  } catch (err) {
    console.error('❌ Erreur proLogin:', err.message, err.stack);
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
};

export const changePassword = async (req, res) => {
  const { newPassword } = req.body;
  const empresaId = req.user.id;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE entreprises SET mot_de_passe = ?, must_change_password = FALSE WHERE id = ?',
      [hashedPassword, empresaId]
    );

    res.json({ success: true, message: 'Mot de passe changé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const getProInfo = async (req, res) => {
  const empresaId = req.user.id;

  try {
    const [rows] = await pool.query(
      'SELECT id, nom, email, recompense_definition FROM entreprises WHERE id = ?',
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
    const [rows] = await pool.query(
      'SELECT id, nom, prenom, telephone, points, type_wallet FROM clients WHERE entreprise_id = ? ORDER BY created_at DESC',
      [empresaId]
    );

    res.json(rows);
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
      'SELECT points FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé ou non autorisé' });
    }

    // Incrémenter le point du client
    const [updateResult] = await pool.query(
      'UPDATE clients SET points = points + 1 WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    // Récupérer le nouveau solde
    const [updatedClient] = await pool.query(
      'SELECT points, nom, prenom FROM clients WHERE id = ?',
      [clientId]
    );

    const newPoints = updatedClient[0].points;
    const response = {
      success: true,
      newPoints,
      clientName: `${updatedClient[0].prenom} ${updatedClient[0].nom}`,
      message: `Point ajouté pour ${updatedClient[0].prenom} ! (Total: ${newPoints})`
    };

    // Vérifier si le palier de 10 points est atteint
    if (newPoints % 10 === 0) {
      const [companyRows] = await pool.query(
        'SELECT recompense_definition FROM entreprises WHERE id = ?',
        [empresaId]
      );

      response.rewardUnlocked = true;
      response.rewardText = companyRows[0].recompense_definition;

      // TODO: Insérer ici la requête HTTP vers les serveurs Apple APNs / Google Wallet API pour la mise à jour dynamique (Push) de la carte.
      // Exemple avec Apple :
      // POST https://api.push.apple.com/3/device/{deviceToken}
      // Signature: JWT signé avec le certificat Apple
      // Payload: { "aps": { "alert": "Palier de 10 points atteint !", ... } }
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
      'SELECT id, nom, recompense_definition FROM entreprises WHERE id = ? AND statut = "actif"',
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
    // Vérifier que l'entreprise existe et est active
    const [companyRows] = await pool.query(
      'SELECT nom FROM entreprises WHERE id = ? AND statut = "actif"',
      [entrepriseId]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée ou inactive' });
    }

    const companyName = companyRows[0].nom;

    // Créer le client avec un UUID unique
    const clientId = uuidv4();

    await pool.query(
      'INSERT INTO clients (id, entreprise_id, nom, prenom, telephone, points, type_wallet) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [clientId, entrepriseId, nom, prenom, telephone, type_wallet]
    );

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
            generic: {
              primaryFields: [
                {
                  key: 'points',
                  label: 'Points',
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
      // Pour Google Wallet, retourner le clientId que le frontend utilisera pour créer le pass
      res.json({
        success: true,
        clientId,
        message: 'Client créé. Utilisez cet ID pour créer la carte dans Google Wallet'
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
