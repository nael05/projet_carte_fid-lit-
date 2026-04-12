import fs from 'fs';

const code = `
export const redeemReward = async (req, res) => {
  const { clientId, rewardTierId } = req.body;
  const empresaId = req.user.id;
  try {
    const [tiers] = await pool.query('SELECT * FROM reward_tiers WHERE id = ? AND entreprise_id = ?', [rewardTierId, empresaId]);
    if (tiers.length === 0) return res.status(404).json({ error: 'Récompense invalide' });
    const tier = tiers[0];
    const [clientRows] = await pool.query('SELECT points FROM clients WHERE id = ? AND entreprise_id = ?', [clientId, empresaId]);
    if (clientRows.length === 0) return res.status(404).json({ error: 'Client introuvable' });
    const currentPoints = clientRows[0].points || 0;
    if (currentPoints < tier.points_required) return res.status(400).json({ error: 'Points insuffisants' });
    const newPoints = currentPoints - tier.points_required;
    await pool.query('UPDATE clients SET points = ? WHERE id = ?', [newPoints, clientId]);
    import('../utils/googleWalletGenerator.js').then(m => m.default.updateLoyaltyPoints(clientId, newPoints).catch(e => {}));
    
    // On renvoie les récompenses encore disponibles après ce retrait
    const [availableRewards] = await pool.query('SELECT * FROM reward_tiers WHERE entreprise_id = ? AND points_required <= ? ORDER BY points_required ASC', [empresaId, newPoints]);
    
    res.json({ success: true, message: 'Cadeau validé avec succès ! (-' + tier.points_required + ' pts)', newPoints, availableRewards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
`;

fs.appendFileSync('controllers/apiController.js', code, 'utf8');
console.log('Appended redeemReward successfully.');
