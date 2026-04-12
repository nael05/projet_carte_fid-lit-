import pool from './db.js';
import bcrypt from 'bcryptjs';

async function reset() {
  const hash = await bcrypt.hash('password123', 10);
  await pool.query("UPDATE entreprises SET email = 'pro@example.com', mot_de_passe = ? WHERE id = '0419655c-3d9a-4d4e-b571-cfa5a23a6d7a'", [hash]);
  console.log('Password updated to password123 for pro@example.com');
  process.exit(0);
}
reset();
