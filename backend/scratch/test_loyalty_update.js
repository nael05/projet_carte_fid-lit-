import pool from '../db.js';

async function testUpdate() {
  const empresaId = 'test-id'; // Use a real ID if available, or just test syntax/behavior
  const payload = {
    points_adding_mode: 'manual',
    points_per_purchase: 15,
    push_notifications_enabled: true
  };

  try {
    // Check if COALESCE works as expected
    const [result] = await pool.query(
      `UPDATE loyalty_config SET 
        points_adding_mode = COALESCE(?, points_adding_mode),
        points_per_purchase = COALESCE(?, points_per_purchase)
       WHERE entreprise_id = ?`,
      [payload.points_adding_mode, payload.points_per_purchase, empresaId]
    );
    console.log('Update result:', result);
  } catch (err) {
    console.error('Update failed:', err.message);
  } finally {
    process.exit();
  }
}

testUpdate();
