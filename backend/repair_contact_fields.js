// repair_contact_fields.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

async function repair() {
    console.log('🚀 Démarrage de la réparation de la base de données (ESM)...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Checking columns for table "entreprises"...');
        const [columns] = await connection.query('DESCRIBE entreprises');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('prenom')) {
            console.log('Adding column "prenom"...');
            await connection.query('ALTER TABLE `entreprises` ADD COLUMN `prenom` VARCHAR(100) DEFAULT NULL AFTER `nom`');
        }

        if (!columnNames.includes('telephone')) {
            console.log('Adding column "telephone"...');
            await connection.query('ALTER TABLE `entreprises` ADD COLUMN `telephone` VARCHAR(20) DEFAULT NULL AFTER `prenom`');
        }

        console.log('✅ Base de données réparée avec succès !');
    } catch (err) {
        console.error('❌ Erreur lors de la réparation :', err.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

repair();
