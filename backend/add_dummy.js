import pool from './db.js';

async function restore() {
  try { 
    await pool.query("ALTER TABLE entreprises ADD COLUMN loyalty_type ENUM('points', 'stamps') DEFAULT 'points'"); 
  } catch(e) {}
  
  try { 
    await pool.query("ALTER TABLE loyalty_config ADD COLUMN loyalty_type ENUM('points', 'stamps') DEFAULT 'points', ADD COLUMN points_for_reward INT DEFAULT 10, ADD COLUMN stamps_for_reward INT DEFAULT 10, ADD COLUMN reward_title VARCHAR(255), ADD COLUMN reward_description TEXT, ADD COLUMN stamps_per_purchase INT DEFAULT 1, ADD COLUMN stamps_count INT DEFAULT 10"); 
  } catch(e) {}
  
  console.log('Dummy columns added back.');
  process.exit(0);
}

restore();
