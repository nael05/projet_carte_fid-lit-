import pool from '../db.js';

async function diagnoseNotifications() {
  try {
    const [regs] = await pool.query('SELECT * FROM apple_pass_registrations');
    console.log('--- APPLE PASS REGISTRATIONS ---');
    console.table(regs);

    const [cards] = await pool.query('SELECT client_id, company_id, pass_serial_number FROM wallet_cards');
    console.log('--- WALLET CARDS ---');
    console.table(cards);

    const [joined] = await pool.query(`
      SELECT r.push_token, w.client_id, w.company_id
      FROM apple_pass_registrations r
      JOIN wallet_cards w ON r.pass_serial_number = w.pass_serial_number
    `);
    console.log('--- JOINED REGISTRATIONS (READY FOR PUSH) ---');
    console.table(joined);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

diagnoseNotifications();
