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

        const testPayload = {
            message: "Mode TEST activé. Voici les données qui seront injectées dans la carte Apple Wallet une fois les certificats ajoutés.",
            donnees_carte: {
                organizationName: clientData.nom,
                description: `Carte de fidelite ${clientData.nom}`,
                logoText: clientData.nom,
                backgroundColor: clientData.couleur_principale,
                primaryFields: [
                    {
                        key: 'points',
                        label: 'POINTS',
                        value: clientData.solde_points.toString()
                    }
                ],
                secondaryFields: [
                    {
                        key: 'client',
                        label: 'CLIENT',
                        value: clientData.prenom
                    }
                ],
                barcode: {
                    format: 'PKBarcodeFormatQR',
                    message: clientData.client_id,
                    messageEncoding: 'iso-8859-1'
                }
            }
        };

        res.status(200).json(testPayload);
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};