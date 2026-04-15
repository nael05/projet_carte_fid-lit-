import db from './db.js';
import logger from './utils/logger.js';

async function repair() {
    console.log('🚀 DÉBUT DE LA RÉPARATION TOTALE - FIDELYZAPP.FR');
    
    try {
        // 1. Récupération des colonnes existantes pour éviter les doublons
        const [entCols] = await db.query('SHOW COLUMNS FROM entreprises');
        const [cliCols] = await db.query('SHOW COLUMNS FROM clients');
        const [customCols] = await db.query('SHOW COLUMNS FROM card_customization');
        const [configCols] = await db.query('SHOW COLUMNS FROM loyalty_config');

        const entFields = entCols.map(c => c.Field);
        const cliFields = cliCols.map(c => c.Field);
        const customFields = customCols.map(c => c.Field);
        const configFields = configCols.map(c => c.Field);

        console.log('--- Vérification des tables ---');

        // 2. Réparation ENTREPRISES
        if (!entFields.includes('loyalty_type')) {
            console.log('➕ Ajout loyalty_type à entreprises...');
            await db.query("ALTER TABLE entreprises ADD COLUMN loyalty_type ENUM('points', 'stamps') DEFAULT 'points' AFTER statut");
        }

        // 3. Réparation LOYALTY_CONFIG
        if (!configFields.includes('loyalty_type')) {
            console.log('➕ Ajout loyalty_type à loyalty_config...');
            await db.query("ALTER TABLE loyalty_config ADD COLUMN loyalty_type ENUM('points', 'stamps') DEFAULT 'points' AFTER entreprise_id");
        }

        // 4. Réparation CARD_CUSTOMIZATION (Verso + Couleurs)
        const customfixes = [
            { name: 'back_fields_phone', type: 'VARCHAR(50) DEFAULT NULL' },
            { name: 'back_fields_address', type: 'TEXT DEFAULT NULL' },
            { name: 'back_fields_instagram', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'back_fields_facebook', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'back_fields_tiktok', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'back_fields_website', type: 'VARCHAR(255) DEFAULT NULL' }
        ];

        for (const fix of customfixes) {
            if (!customFields.includes(fix.name)) {
                console.log(`➕ Ajout ${fix.name} à card_customization...`);
                await db.query(`ALTER TABLE card_customization ADD COLUMN ${fix.name} ${fix.type}`);
            }
        }

        // 5. Création CUSTOMER_STAMPS si absente
        console.log('--- Vérification customer_stamps ---');
        await db.query(`
            CREATE TABLE IF NOT EXISTS customer_stamps (
                id VARCHAR(36) PRIMARY KEY,
                client_id VARCHAR(36) NOT NULL,
                entreprise_id VARCHAR(36) NOT NULL,
                stamps_collected INT DEFAULT 0,
                stamps_redeemed INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_client (client_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 6. Création APPLE_PASS_REGISTRATIONS si absente (VITAL POUR PUSH)
        console.log('--- Vérification registrations ---');
        await db.query(`
            CREATE TABLE IF NOT EXISTS apple_pass_registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_library_identifier VARCHAR(255) NOT NULL,
                push_token VARCHAR(255) NOT NULL,
                pass_type_identifier VARCHAR(255) NOT NULL,
                pass_serial_number VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_registration (device_library_identifier, pass_serial_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('✨ RÉPARATION RÉUSSIE AVEC SUCCÈS !');
        process.exit(0);

    } catch (err) {
        console.error('❌ ERREUR LORS DE LA RÉPARATION :', err.message);
        process.exit(1);
    }
}

repair();
