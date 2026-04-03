const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await db.execute('SELECT * FROM utilisateurs WHERE email = ?', [email]);
        
        if (rows.length === 0) return res.status(401).json({ error: 'Identifiants incorrects' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.mot_de_passe_hash);

        if (!match) return res.status(401).json({ error: 'Identifiants incorrects' });

        const token = jwt.sign(
            { userId: user.id, entrepriseId: user.entreprise_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

const getClients = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, prenom, email, solde_points, date_creation FROM clients_finaux WHERE entreprise_id = ? ORDER BY date_creation DESC',
            [req.user.entrepriseId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

const createClient = async (req, res) => {
    try {
        const { entrepriseId } = req.params;
        const { prenom, email } = req.body;
        const clientId = uuidv4();

        await db.execute(
            'INSERT INTO clients_finaux (id, entreprise_id, prenom, email) VALUES (?, ?, ?, ?)',
            [clientId, entrepriseId, prenom, email]
        );

        res.status(201).json({ message: 'Client créé', id: clientId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Cet email est déjà utilisé pour cette boutique.' });
        }
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

const addPoints = async (req, res) => {
    try {
        const { clientId, points } = req.body;
        const pointValue = parseInt(points, 10);

        if (isNaN(pointValue) || pointValue <= 0) return res.status(400).json({ error: 'Nombre de points invalide' });

        const [client] = await db.execute(
            'SELECT * FROM clients_finaux WHERE id = ? AND entreprise_id = ?',
            [clientId, req.user.entrepriseId]
        );

        if (client.length === 0) return res.status(404).json({ error: "Client introuvable ou n'appartient pas à votre boutique" });

        await db.execute('UPDATE clients_finaux SET solde_points = solde_points + ? WHERE id = ?', [pointValue, clientId]);
        
        await db.execute(
            'INSERT INTO scans_historique (id, entreprise_id, client_final_id, utilisateur_id, points_ajoutes) VALUES (?, ?, ?, ?, ?)',
            [uuidv4(), req.user.entrepriseId, clientId, req.user.userId, pointValue]
        );

        res.json({ message: `${pointValue} points ajoutés avec succès !` });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'ajout des points" });
    }
};

const getBranding = async (req, res) => {
    try {
        const { entrepriseId } = req.params;
        const [rows] = await db.execute(
            'SELECT nom, couleur_principale, url_logo FROM entreprises WHERE id = ?',
            [entrepriseId]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Entreprise introuvable' });
        res.json(rows[0]);
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

        res.status(200).json({
            status: "MODE_TEST_SANS_APPLE",
            client: clientData,
            message: "Pour avoir la vraie carte, il faudra les certificats Apple plus tard.",
            donnees_test: {
                nom: clientData.nom,
                client: clientData.prenom,
                points: clientData.solde_points,
                id_qr_code: clientData.client_id
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// C'est cette partie à la fin qui manquait et qui relie le tout aux routes !
module.exports = {
    login,
    getClients,
    createClient,
    addPoints,
    getBranding,
    generateApplePass
};