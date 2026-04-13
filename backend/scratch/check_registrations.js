import pool from '../db.js';

async function run() {
  try {
    const [regs] = await pool.query('SELECT * FROM apple_pass_registrations');
    console.log('--- REGISTRATIONS ---');
    console.log(JSON.stringify(regs, null, 2));
    
    const [cards] = await pool.query('SELECT id, pass_serial_number, points_balance FROM wallet_cards WHERE pass_serial_number NOT LIKE "GOOGLE_%"');
    console.log('\n--- APPLE CARDS ---');
    console.log(JSON.stringify(cards, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
