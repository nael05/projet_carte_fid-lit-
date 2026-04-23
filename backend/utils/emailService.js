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
        htmlContent: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e4e9;">

      <!-- Header -->
      <tr>
        <td style="background:#6366F1;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Fidelyz</p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);font-weight:400;">Plateforme de fidélité digitale</p>
        </td>
      </tr>

      <!-- Intro -->
      <tr>
        <td style="padding:36px 40px 0;">
          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Bienvenue${prenomDisplay},</p>
          <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;">
            Votre espace commerçant <strong style="color:#111827;">${nom}</strong> vient d'être créé sur Fidelyz.<br>
            Retrouvez ci-dessous vos informations de connexion et les premières étapes pour démarrer.
          </p>
        </td>
      </tr>

      <!-- Credentials -->
      <tr>
        <td style="padding:24px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e2e4e9;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:12px 20px;border-bottom:1px solid #e2e4e9;">
                <p style="margin:0;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Identifiants de connexion</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#9ca3af;width:130px;">Entreprise</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${nom}</td>
                  </tr>
                  ${telephone ? `<tr>
                    <td style="padding:6px 0;font-size:13px;color:#9ca3af;">Telephone</td>
                    <td style="padding:6px 0;font-size:13px;color:#374151;">${telephone}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#9ca3af;">Email</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#9ca3af;">Fidelite</td>
                    <td style="padding:6px 0;font-size:13px;color:#374151;">${loyaltyLabel}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Password -->
      <tr>
        <td style="padding:16px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9ec;border:1px solid #f0c858;border-radius:8px;">
            <tr>
              <td style="padding:18px 24px;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.8px;">Mot de passe temporaire</p>
                <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;letter-spacing:3px;font-family:'Courier New',Courier,monospace;">${tempPassword}</p>
                <p style="margin:0;font-size:12px;color:#92400e;">A modifier obligatoirement lors de votre premiere connexion.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Steps -->
      <tr>
        <td style="padding:24px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e2e4e9;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:12px 20px;border-bottom:1px solid #e2e4e9;">
                <p style="margin:0;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Premiers pas</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;">

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                  <tr>
                    <td style="width:32px;vertical-align:top;padding-top:1px;">
                      <div style="width:24px;height:24px;background:#6366F1;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">1</div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">Connectez-vous a votre espace</p>
                      <p style="margin:0;font-size:13px;color:#6b7280;">Rendez-vous sur <a href="${loginUrl}" style="color:#6366F1;text-decoration:none;">${loginUrl}</a> avec votre email et le mot de passe temporaire.</p>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                  <tr>
                    <td style="width:32px;vertical-align:top;padding-top:1px;">
                      <div style="width:24px;height:24px;background:#6366F1;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">2</div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">Definissez un mot de passe personnel</p>
                      <p style="margin:0;font-size:13px;color:#6b7280;">Une invite s'affiche automatiquement a la premiere connexion pour securiser votre compte.</p>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                  <tr>
                    <td style="width:32px;vertical-align:top;padding-top:1px;">
                      <div style="width:24px;height:24px;background:#6366F1;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">3</div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">Personnalisez votre carte</p>
                      <p style="margin:0;font-size:13px;color:#6b7280;">Onglet <strong>Carte</strong> — ajoutez votre logo, vos couleurs et le nom affiche sur la carte client.</p>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                  <tr>
                    <td style="width:32px;vertical-align:top;padding-top:1px;">
                      <div style="width:24px;height:24px;background:#6366F1;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">4</div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">Configurez vos recompenses</p>
                      <p style="margin:0;font-size:13px;color:#6b7280;">Onglet <strong>Fidelite</strong> — fixez le seuil de ${loyaltyLabel.toLowerCase()} et les avantages offerts a vos clients.</p>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:32px;vertical-align:top;padding-top:1px;">
                      <div style="width:24px;height:24px;background:#6366F1;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">5</div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#111827;">Invitez vos clients</p>
                      <p style="margin:0;font-size:13px;color:#6b7280;">Onglet <strong>Recruter</strong> — partagez votre QR code ou lien d'inscription pour que vos clients ajoutent la carte a leur Wallet.</p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:28px 40px 36px;text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;background:#6366F1;color:#ffffff;padding:13px 32px;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
            Acceder a mon espace
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;padding:16px 40px;border-top:1px solid #e2e4e9;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Email genere automatiquement par Fidelyz — merci de ne pas repondre.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
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
