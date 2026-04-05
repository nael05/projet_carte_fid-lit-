import Database from 'better-sqlite3';

const db = new Database('./fidelite.db');

try {
  const admins = db.prepare('SELECT id, email FROM admins').all();
  console.log('Admins in database:');
  admins.forEach(admin => {
    console.log(`  - ${admin.email} (ID: ${admin.id})`);
  });
  
  if (admins.length === 0) {
    console.log('  No admins found - need to initialize');
  }
} catch (error) {
  console.log('Error:', error.message);
} finally {
  db.close();
}
