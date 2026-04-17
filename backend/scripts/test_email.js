import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

async function test() {
  console.log('--- TEST CONNEXION BREVO ---');
  console.log('Email utilisé :', process.env.MAIL_USER || 'fidelyz@outlook.fr');
  console.log('Clé API présente :', process.env.BREVO_API_KEY ? 'OUI' : 'NON');

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: process.env.MAIL_USER || 'fidelyz@outlook.fr',
      pass: process.env.BREVO_API_KEY
    }
  });

  try {
    await transporter.verify();
    console.log('✅ CONNEXION RÉUSSIE ! Brevo accepte vos identifiants.');
    
    console.log('Envoi d\'un email de test...');
    await transporter.sendMail({
      from: `"Test Fidelyz" <${process.env.MAIL_USER || 'fidelyz@outlook.fr'}>`,
      to: 'nael.mrl@icloud.com',
      subject: 'Test Brevo Fidelyz',
      text: 'Si vous recevez ce mail, tout fonctionne !'
    });
    console.log('✅ EMAIL ENVOYÉ !');
  } catch (err) {
    console.error('❌ ÉCHEC DU TEST :');
    console.error(err.message);
    if (err.message.includes('535')) {
      console.log('\n💡 CONSEIL : L\'email ou la clé est incorrecte. Vérifiez que MAIL_USER dans le fichier .env est bien l\'email de votre compte Brevo.');
    }
  }
}

test();
