import { generatePkpass } from './utils/pkpass-generator.js';
import fs from 'fs';

(async function(){
  try {
    const buffer = await generatePkpass({
      id: 'TEST-GEN-001',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      points: 123,
      cardNumber: 'TEST-GEN-001'
    });
    fs.writeFileSync('./test-output.pkpass', buffer);
    console.log('Written test-output.pkpass', buffer.length, 'bytes');
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
})();
