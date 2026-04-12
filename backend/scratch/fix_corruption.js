import fs from 'fs';

const filePath = 'controllers/apiController.js';
let content = fs.readFileSync(filePath, 'utf8');

// Identifier le bloc corrompu
// Le bloc commence à la fin de adjustPoints et se termine à la fin de registerClientAndGeneratePass

const startMarker = 'export const adjustPoints';
const endMarker = "note: 'Pour ajouter au wallet, utiliser POST /api/app/wallet/create'\n    });\n  } catch (err) {\n    logger.error('Register client error', { error: err.message });\n    res.status(500).json({ error: 'Erreur serveur' });\n  }\n};";

// On va plutôt chercher la fonction entière registerClientAndGeneratePass pour la réécrire proprement
const registerFuncStartIdx = content.indexOf("export const registerClientAndGeneratePass");
// Si non trouvé, c'est qu'il a été effacé par erreur. 
// On va chercher la ligne 824-825 approximativement ou le texte orphelin.

const orphanText = "'INSERT INTO clients (id, entreprise_id, nom, prenom, telephone, points, type_wallet) VALUES (?, ?, ?, ?, ?, 0, ?)'";
const orphanIdx = content.indexOf(orphanText);

if (orphanIdx !== -1) {
    const beforeOrphan = content.substring(0, content.lastIndexOf("export const", orphanIdx));
    const afterOrphan = content.substring(content.indexOf("};", orphanIdx + orphanText.length) + 2);
    
    // On va aussi chercher où s'arrête le bloc corrompu (la fin de la fonction catch)
    const endOfRegister = content.indexOf("};", content.indexOf("logger.error('Register client error'", orphanIdx));
    const definitiveAfter = content.substring(endOfRegister + 2);

    const cleanRegister = `
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
    const [companyRows] = await pool.query(
      'SELECT id, nom FROM entreprises WHERE id = ? AND statut = "actif"',
      [entrepriseId]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({ error: 'Entreprise non trouvée ou inactive' });
    }

    const clientId = randomUUID();
    await pool.query(
      'INSERT INTO clients (id, entreprise_id, nom, prenom, telephone, points, type_wallet) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [clientId, entrepriseId, nom, prenom, telephone, type_wallet]
    );
    
    logger.info(\`✅ Client créé: \${clientId} - \${prenom} \${nom}\`);

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
`;

    fs.writeFileSync(filePath, beforeOrphan + cleanRegister + definitiveAfter);
    console.log('Fixed registerClientAndGeneratePass successfully.');
} else {
    console.log('Orphan text not found.');
}
