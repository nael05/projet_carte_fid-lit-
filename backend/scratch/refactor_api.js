import fs from 'fs';

const filePath = 'controllers/apiController.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Refactor handleScan
const newHandleScan = `export const handleScan = async (req, res) => {
  const { clientId, pointsToAdd: bodyPoints } = req.body;
  const empresaId = req.user.id;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId requis' });
  }

  try {
    const [clientRows] = await pool.query(
      'SELECT nom, prenom, points FROM clients WHERE id = ? AND entreprise_id = ?',
      [clientId, empresaId]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé ou non autorisé' });
    }

    const [config] = await pool.query(
      'SELECT points_adding_mode, points_per_purchase, reward_title FROM loyalty_config WHERE entreprise_id = ?',
      [empresaId]
    );

    if (config.length === 0) {
      return res.status(400).json({ error: 'Configuration de fidélité non trouvée' });
    }

    const loyaltyConfig = config[0];
    let pointsToAdd = loyaltyConfig.points_per_purchase || 10;
    if (loyaltyConfig.points_adding_mode === 'manual' && typeof bodyPoints === 'number') {
      pointsToAdd = bodyPoints;
    }

    const currentPoints = clientRows[0].points || 0;
    const newPoints = currentPoints + pointsToAdd;

    await pool.query(
      'UPDATE clients SET points = ? WHERE id = ? AND entreprise_id = ?',
      [newPoints, clientId, empresaId]
    );

    const transactionId = randomUUID();
    await pool.query(
      "INSERT INTO transaction_history (id, client_id, entreprise_id, type, points_change, description) VALUES (?, ?, ?, 'add_points', ?, ?)",
      [transactionId, clientId, empresaId, pointsToAdd, pointsToAdd + ' point(s) ajouté(s)']
    );

    // Sync Wallet
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

    res.json({ success: true, clientName: clientRows[0].prenom + ' ' + clientRows[0].nom, pointsAdded: pointsToAdd, newPoints: newPoints });
  } catch (err) {
    console.error('Handle scan error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};`;

// 2. Refactor adjustPoints
const newAdjustPoints = `export const adjustPoints = async (req, res) => {
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

    // Sync Wallet
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
};`;

content = content.replace(/export const handleScan = async \(req, res\) => \{[\s\S]*?\};/, newHandleScan);
content = content.replace(/export const adjustPoints = async \(req, res\) => \{[\s\S]*?\};/, newAdjustPoints);

// Cleanup remaining stamps mentions
content = content.replace(/LEFT JOIN customer_stamps cs ON cs\.client_id = c\.id AND cs\.entreprise_id = c\.entreprise_id/g, '');
content = content.replace(/cs\.stamps_collected,/g, '');
content = content.replace(/stamps_collected,/g, '');
content = content.replace(/stamps_balance,/g, '');
content = content.replace(/stamps_for_reward,/g, '');
content = content.replace(/stamps_per_purchase,/g, '');

fs.writeFileSync(filePath, content);
console.log('apiController.js full refactor completed.');
