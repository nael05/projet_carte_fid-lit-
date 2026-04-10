import pool from '../db.js';

async function debugLoyalty() {
  try {
    const [configs] = await pool.query('SELECT entreprise_id, stamps_for_reward, stamps_count FROM loyalty_config');
    console.log('📊 Configs:', configs);
    
    const [stamps] = await pool.query('SELECT client_id, entreprise_id, stamps_collected FROM customer_stamps WHERE stamps_collected >= 10');
    console.log('📊 Stamps >= 10:', stamps);

  } catch (err) {
    console.error('🔥 Erreur:', err.message);
  } finally {
    process.exit();
  }
}

debugLoyalty();
