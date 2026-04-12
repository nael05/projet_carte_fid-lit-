import fs from 'fs';

const filePath = 'controllers/apiController.js';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'export const adjustPoints';
const endMarker = 'export const updateReward';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const before = content.substring(0, startIdx);
    const nextFunc = content.substring(endIdx);
    
    const cleanAdjust = `export const adjustPoints = async (req, res) => {
  const { clientId } = req.params;
  const { adjustment } = req.body;
  const empresaId = req.user.id;

  if (typeof adjustment !== 'number') {
    return res.status(400).json({ error: 'Ajustement numérique requis' });
  }

  try {
    const [clientRows] = await pool.query(
      'SELECT points, nom FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé ou non autorisé' });
    }

    const { points } = clientRows[0];
    const newPoints = Math.max(0, Number(points || 0) + Number(adjustment));

    await pool.query(
      'UPDATE clients SET points = ? WHERE id = ? AND entreprise_id = ?',
      [newPoints, clientId, empresaId]
    );

    try {
      const [walletRows] = await pool.query(
        'SELECT id, pass_serial_number FROM wallet_cards WHERE client_id = ? AND company_id = ?',
        [clientId, empresaId]
      );
      if (walletRows.length > 0) {
        const wallet = walletRows[0];
        await pool.query('UPDATE wallet_cards SET points_balance = ?, last_updated = NOW() WHERE id = ?', [newPoints, wallet.id]);
        const [regs] = await pool.query('SELECT push_token FROM apple_pass_registrations WHERE pass_serial_number = ?', [wallet.pass_serial_number]);
        if (regs.length > 0) {
          await apnService.sendBulkUpdateNotifications(regs.map(r => r.push_token));
        }
      }
      await googleWalletGenerator.updateLoyaltyPoints(clientId, newPoints);
    } catch (e) {
      console.warn('Wallet sync failed', e.message);
    }

    res.json({ success: true, newPoints });
  } catch (err) {
    console.error('Adjust points error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

`;

    fs.writeFileSync(filePath, before + cleanAdjust + nextFunc);
    console.log('Final surgical cleanup completed.');
} else {
    console.error('Markers not found', { startIdx, endIdx });
}
