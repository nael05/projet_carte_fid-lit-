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
  async sendWelcomeEmail({ email, nom, prenom, telephone, tempPassword, loyaltyType, frontendUrl }) {
    if (!this.apiKey) {
      throw new Error('Service d\'email non configuré');
    }

    const loginUrl = `${frontendUrl}/pro/login`;
    const loyaltyLabel = loyaltyType === 'stamps' ? 'Tampons' : 'Points';
    const prenomDisplay = prenom ? ` ${prenom}` : '';

    try {
      await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: this.sender,
        to: [{ email }],
        subject: `Bienvenue sur Fidelyz – Vos accès commerçant`,
        htmlContent: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f8f9fb; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366F1 0%, #818cf8 100%); padding: 36px 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Fidelyz</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Votre plateforme de fidélité digitale</p>
            </div>

            <!-- Intro -->
            <div style="padding: 32px 32px 0;">
              <h2 style="color: #1f2937; margin: 0 0 12px; font-size: 20px;">Bienvenue${prenomDisplay} ! 🎉</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 8px;">
                Votre espace commerçant <strong>${nom}</strong> vient d'être créé sur Fidelyz.<br>
                Vous trouverez ci-dessous toutes les informations nécessaires pour démarrer.
              </p>
            </div>

            <!-- Credentials box -->
            <div style="margin: 24px 32px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
              <div style="background: #f3f4f6; padding: 12px 20px; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Vos identifiants de connexion</p>
              </div>
              <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 140px;">Entreprise</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">${nom}</td>
                  </tr>
                  ${telephone ? `<tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Téléphone</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${telephone}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email (login)</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Mode fidélité</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${loyaltyLabel}</td>
                  </tr>
                </table>
                <!-- Password highlight -->
                <div style="margin-top: 16px; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px 20px;">
                  <p style="margin: 0 0 6px; font-size: 12px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ Mot de passe temporaire</p>
                  <p style="margin: 0; font-size: 22px; font-weight: 700; color: #1f2937; letter-spacing: 2px; font-family: 'Courier New', monospace;">${tempPassword}</p>
                  <p style="margin: 8px 0 0; font-size: 12px; color: #92400e;">Vous devrez le changer dès votre première connexion.</p>
                </div>
              </div>
            </div>

            <!-- Steps -->
            <div style="margin: 0 32px 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
              <div style="background: #f3f4f6; padding: 12px 20px; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Comment démarrer</p>
              </div>
              <div style="padding: 20px;">
                <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
                  <div style="min-width: 28px; height: 28px; background: #6366F1; color: #fff; border-radius: 50%; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14px; text-align: center; line-height: 28px;">1</div>
                  <div>
                    <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">Connectez-vous à votre espace</p>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Rendez-vous sur <a href="${loginUrl}" style="color: #6366F1;">${loginUrl}</a> et entrez votre email ainsi que le mot de passe temporaire ci-dessus.</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
                  <div style="min-width: 28px; height: 28px; background: #6366F1; color: #fff; border-radius: 50%; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14px; text-align: center; line-height: 28px;">2</div>
                  <div>
                    <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">Choisissez un nouveau mot de passe</p>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Une fenêtre s'affiche automatiquement pour sécuriser votre compte. Choisissez un mot de passe personnel et mémorisable.</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
                  <div style="min-width: 28px; height: 28px; background: #6366F1; color: #fff; border-radius: 50%; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14px; text-align: center; line-height: 28px;">3</div>
                  <div>
                    <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">Personnalisez votre carte de fidélité</p>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Dans l'onglet <strong>Carte</strong>, ajoutez votre logo, choisissez vos couleurs et configurez le nom affiché sur la carte.</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
                  <div style="min-width: 28px; height: 28px; background: #6366F1; color: #fff; border-radius: 50%; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14px; text-align: center; line-height: 28px;">4</div>
                  <div>
                    <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">Configurez vos récompenses</p>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Dans l'onglet <strong>Fidélité</strong>, définissez le nombre de ${loyaltyLabel.toLowerCase()} nécessaires et les cadeaux à offrir à vos clients.</p>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start;">
                  <div style="min-width: 28px; height: 28px; background: #6366F1; color: #fff; border-radius: 50%; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14px; text-align: center; line-height: 28px;">5</div>
                  <div>
                    <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">Recrutez vos premiers clients</p>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Partagez votre QR code ou lien d'inscription (onglet <strong>Recruter</strong>) pour que vos clients ajoutent la carte à leur Apple Wallet ou Google Wallet.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div style="text-align: center; padding: 0 32px 32px;">
              <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366F1 0%, #818cf8 100%); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px;">
                Accéder à mon espace →
              </a>
            </div>

            <!-- Footer -->
            <div style="background: #f3f4f6; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Cet email a été envoyé automatiquement par Fidelyz. Ne pas répondre à cet email.</p>
            </div>

          </div>
        `
      }, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`✅ Email de bienvenue envoyé à ${email} (${nom})`);
    } catch (err) {
      logger.error(`❌ Échec de l'envoi de l'email de bienvenue à ${email}:`, err.response?.data || err.message);
      throw new Error('Erreur lors de l\'envoi de l\'email de bienvenue');
    }
  }
}

export default new EmailService();
