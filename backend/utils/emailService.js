import axios from 'axios';
import logger from './logger.js';

class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.sender = {
      name: 'Fidelyz Support',
      email: process.env.MAIL_USER || 'nael80393@gmail.com'
    };
    
    if (!this.apiKey) {
      logger.error('❌ BREVO_API_KEY manquante dans le .env');
    } else {
      logger.info('✅ Service d\'email initialisé (Brevo API)');
    }
  }

  async sendPasswordResetEmail(email, resetUrl) {
    if (!this.apiKey) {
      throw new Error('Service d\'email non configuré');
    }

    try {
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: this.sender,
        to: [{ email }],
        subject: 'Réinitialisation de votre mot de passe Pro - Fidelyz',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #6366F1; text-align: center;">Récupération de mot de passe</h2>
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe commerçant Fidelyz.</p>
            <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable pendant 60 minutes.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #6366F1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Réinitialiser mon mot de passe</a>
            </div>
            <p>Si vous n'avez pas demandé ce changement, vous pouvez ignorer cet e-mail en toute sécurité.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666; text-align: center;">Cet email a été envoyé automatiquement par Fidelyz.</p>
          </div>
        `
      }, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`✅ Email de réinitialisation envoyé à ${email} via API Brevo`);
      return response.data;
    } catch (err) {
      logger.error(`❌ Échec de l'envoi de l'email à ${email}:`, err.response?.data || err.message);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }
  }
}

export default new EmailService();
