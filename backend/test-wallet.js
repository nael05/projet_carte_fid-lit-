import dotenv from 'dotenv';
dotenv.config();

import { passGenerator } from './utils/passGenerator.js';

const clientData = {
  clientId: 1,
  firstName: 'Jean',
  lastName: 'Dupont',
  phoneNumber: '0612345678',
  companyName: 'Pâtisserie Laurent',
  loyaltyType: 'points',
  balance: 0,
  qrCodeValue: '1'
};

const customization = {
  apple_background_color: '#1f2937',
  apple_text_color: '#ffffff'
};

async function run() {
  try {
    const buffer = await passGenerator.generateLoyaltyPass(
      clientData,
      customization,
      'TEST123ABC456XYZ12',
      'token_test_12345'
    );
    console.log('✅ Pass généré:', buffer.length, 'bytes');
  } catch (e) {
    const fs = await import('fs');
    fs.writeFileSync('error_clean.txt', e.message + '\\n' + e.stack);
    console.error('Error written to error_clean.txt');
  }
}
run();
