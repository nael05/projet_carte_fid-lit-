import db from './backend/db.js';
import fs from 'fs';

async function dumpSchema() {
  try {
    const tables = ['entreprises', 'clients', 'wallet_cards', 'apple_pass_registrations', 'card_customization'];
    let output = '';

    for (const table of tables) {
      try {
        const [rows] = await db.query(`DESCRIBE ${table}`);
        output += `\n--- Table: ${table} ---\n`;
        rows.forEach(row => {
          output += `${row.Field} - ${row.Type} - ${row.Null} - ${row.Key}\n`;
        });
      } catch (e) {
        output += `\n--- Table: ${table} (NOT FOUND) ---\n`;
      }
    }

    fs.writeFileSync('./backend/scratch/actual_schema.txt', output);
    console.log('Schema dumped to ./backend/scratch/actual_schema.txt');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dumpSchema();
