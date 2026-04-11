import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('--- Migration : Ajout des colonnes Google Wallet ---');

  try {
    const columnsToAdd = [
      { name: 'google_primary_color', type: "VARCHAR(7) DEFAULT '#1f2937'" },
      { name: 'google_text_color', type: "VARCHAR(7) DEFAULT '#ffffff'" },
      { name: 'google_logo_url', type: 'TEXT' },
      { name: 'google_hero_image_url', type: 'TEXT' },
      { name: 'google_card_title', type: 'VARCHAR(100)' },
      { name: 'google_card_subtitle', type: 'VARCHAR(100)' }
    ];

    for (const col of columnsToAdd) {
      // Vérifier si la colonne existe déjà
      const [results] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = 'card_customization' 
        AND column_name = ? 
        AND table_schema = ?`, 
        [col.name, process.env.DB_NAME]
      );

      if (results[0].count === 0) {
        console.log(`Ajout de la colonne : ${col.name}...`);
        await connection.query(`ALTER TABLE card_customization ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`La colonne ${col.name} existe déjà.`);
      }
    }

    console.log('Migration terminée avec succès !');
  } catch (err) {
    console.error('Erreur lors de la migration:', err);
  } finally {
    await connection.end();
  }
}

migrate();
