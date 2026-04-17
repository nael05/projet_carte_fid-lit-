import nodemailer from 'nodemailer';
import logger from './logger.js';

/**
 * Service pour envoyer des emails transactionnels
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER || 'fidelyz@outlook.fr', // Votre email de compte Brevo
        pass: process.env.BREVO_API_KEY || process.env.MAIL_PASS,
      }
    });

    // Vérifier la connexion au démarrage
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ Service d\'email prêt (Brevo SMTP)');
    } catch (err) {
      logger.error('❌ Erreur de connexion au service d\'email (Brevo):', err.message);
    }
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(to, token) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Fidelyz Support" <${process.env.MAIL_USER}>`,
      to,
      subject: 'Réinitialisation de votre mot de passe Fidelyz',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #1f2937;">Mot de passe oublié ?</h2>
          <p>Bonjour,</p>
          <p>Vous avez fait une demande de réinitialisation de votre mot de passe pour votre compte commerçant Fidelyz.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Réinitialiser mon mot de passe</a>
          </div>
          <p>Ce lien est valable pendant <strong>60 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">Ceci est un mail automatique, merci de ne pas y répondre.</p>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`📧 Email de récupération envoyé à ${to}`);
      return info;
    } catch (err) {
      logger.error(`❌ Échec de l'envoi de l'email à ${to}:`, err.message);
      throw err;
    }
  }
}

export default new EmailService();
