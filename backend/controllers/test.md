const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { PKPass } = require('passkit-generator');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const login = async (req, res) => {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    try {
        const query = 'SELECT id, entreprise_id, mot_de_passe_hash, role FROM utilisateurs WHERE email = ?';
        const [rows] = await db.execute(query, [email]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        const utilisateur = rows[0];
        const match = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe_hash);

        if (!match) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        const token = jwt.sign(
            { 
                id: utilisateur.id, 
                entreprise_id: utilisateur.entreprise_id, 
                role: utilisateur.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

const getClients = async (req, res) => {
    try {
        const entrepriseId = req.user.entreprise_id;
        const query = 'SELECT id, prenom, email, solde_points, pass_id, date_creation FROM clients_finaux WHERE entreprise_id = ?';
        const [rows] = await db.execute(query, [entrepriseId]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

const createClient = async (req, res) => {
    try {
        const { entrepriseId } = req.params; 
        const { prenom, email } = req.body;
        
        if (!prenom || !email) {
            return res.status(400).json({ error: 'Prenom et email requis' });
        }

        const id = uuidv4();
        const query = 'INSERT INTO clients_finaux (id, entreprise_id, prenom, email, solde_points) VALUES (?, ?, ?, ?, 0)';
        await db.execute(query, [id, entrepriseId, prenom, email]);

        res.status(201).json({ id, prenom, email, solde_points: 0 });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email deja utilise pour cette entreprise' });
        }
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

const addPoints = async (req, res) => {
    const { clientId, points } = req.body;
    const entrepriseId = req.user.entreprise_id;
    const utilisateurId = req.user.id;

    if (!clientId || !points) {
        return res.status(400).json({ error: 'Client et points requis' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [client] = await connection.execute(
            'SELECT id FROM clients_finaux WHERE id = ? AND entreprise_id = ?',
            [clientId, entrepriseId]
        );

        if (client.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Client introuvable ou non autorise' });
        }

        await connection.execute(
            'UPDATE clients_finaux SET solde_points = solde_points + ? WHERE id = ?',
            [points, clientId]
        );

        const scanId = uuidv4();
        await connection.execute(
            'INSERT INTO scans_historique (id, entreprise_id, client_final_id, utilisateur_id, points_ajoutes) VALUES (?, ?, ?, ?, ?)',
            [scanId, entrepriseId, clientId, utilisateurId, points]
        );

        await connection.commit();
        res.status(200).json({ message: 'Points ajoutes avec succes' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        connection.release();
    }
};

const getBranding = async (req, res) => {
    try {
        const { entrepriseId } = req.params;
        const query = 'SELECT nom, couleur_principale, url_logo FROM entreprises WHERE id = ?';
        const [results] = await db.execute(query, [entrepriseId]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Entreprise introuvable' });
        }

        res.status(200).json(results[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

const generateApplePass = async (req, res) => {
    try {
        const { clientId } = req.params;

        const query = `
            SELECT c.prenom, c.solde_points, c.id AS client_id, e.nom, e.couleur_principale 
            FROM clients_finaux c
            JOIN entreprises e ON c.entreprise_id = e.id
            WHERE c.id = ?
        `;
        const [rows] = await db.execute(query, [clientId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Client introuvable' });
        }

        const clientData = rows[0];

        const pass = new PKPass(
            {
                'pass.com.votre-app.fidelite': fs.readFileSync(path.join(__dirname, '../certs/signerCert.pem')),
                'pass.com.votre-app.fidelite': fs.readFileSync(path.join(__dirname, '../certs/signerKey.pem'))
            },
            process.env.APPLE_PASS_PASSWORD,
            fs.readFileSync(path.join(__dirname, '../certs/wwdr.pem'))
        );

        pass.type = 'storeCard';
        pass.teamIdentifier = process.env.APPLE_TEAM_ID;
        pass.passTypeIdentifier = 'pass.com.votre-app.fidelite';
        pass.organizationName = clientData.nom;
        pass.description = `Carte de fidelite ${clientData.nom}`;
        pass.logoText = clientData.nom;
        pass.backgroundColor = clientData.couleur_principale;

        pass.primaryFields.push({
            key: 'points',
            label: 'POINTS',
            value: clientData.solde_points.toString()
        });

        pass.secondaryFields.push({
            key: 'client',
            label: 'CLIENT',
            value: clientData.prenom
        });

        pass.barcode = {
            format: 'PKBarcodeFormatQR',
            message: clientData.client_id,
            messageEncoding: 'iso-8859-1'
        };

        const buffer = await pass.getAsBuffer();

        res.set({
            'Content-Type': 'application/vnd.apple.pkpass',
            'Content-Disposition': `attachment; filename="${clientData.nom.replace(/\s+/g, '_')}-fidelite.pkpass"`
        });
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

module.exports = { 
    login, 
    getClients, 
    createClient, 
    addPoints, 
    getBranding, 
    generateApplePass 
};