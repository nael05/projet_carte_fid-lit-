import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import logger from './logger.js';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

class GoogleWalletGenerator {
  constructor() {
    this.keyFilePath = path.join(__dirname, '..', process.env.GOOGLE_WALLET_KEY_PATH || 'config/google-wallet-key.json');
    this.issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    this.client = null;
    this.credentials = null;
    this._init();
  }

  _init() {
    try {
      if (fs.existsSync(this.keyFilePath)) {
        const keyData = JSON.parse(fs.readFileSync(this.keyFilePath, 'utf8'));
        this.credentials = keyData;
        const auth = new GoogleAuth({
          keyFile: this.keyFilePath,
          scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
        });
        this.client = google.walletobjects({ version: 'v1', auth });
      }
    } catch (err) {
      logger.error('Erreur d\'initialisation Google Wallet:', err);
    }
  }

  async createOrUpdateClass(empresaId, config, empresaName, loyaltyType = 'points') {
    if (!this.client) return null;

    // RETOUR À L'ID D'ORIGINE POUR LA STABILITÉ
    const classId = `${this.issuerId}.${empresaId}_loyalty_class`;
    
    const logoUrl = config.google_logo_url;
    const heroImageUrl = config.google_hero_image_url;
    const bgColor = config.google_primary_color || '#1f2937';

    const loyaltyClass = {
      id: classId,
      issuerName: (empresaName || 'Fidelyz').substring(0, 20),
      programName: (config.google_card_title || 'Programme Fidélité').substring(0, 20),
      programLogo: logoUrl ? {
        sourceUri: { uri: this._getAbsoluteUrl(logoUrl) }
      } : {
        sourceUri: { uri: 'https://www.gstatic.com/images/branding/product/2x/wallet_48dp.png' }
      },
      hexBackgroundColor: bgColor.startsWith('#') ? bgColor : `#${bgColor}`,
      textModulesData: [
        {
          header: 'Infos',
          body: config.google_card_subtitle || 'Votre carte de fidélité',
          id: 'subtitle_module'
        }
      ]
    };

    if (heroImageUrl) {
      loyaltyClass.heroImage = {
        sourceUri: { uri: this._getAbsoluteUrl(heroImageUrl) }
      };
    }

    try {
      try {
        await this.client.loyaltyclass.get({ resourceId: classId });
        logger.info(`Classe existante trouvée: ${classId}, tentative de mise à jour...`);
        
        // Préparer le body pour le patch: supprimer ID et reviewStatus s'ils traînent
        try {
          // Destructuration stricte pour exclure id et reviewStatus du corps de la requête PATCH
          // Google rejette souvent le PATCH si 'id' ou 'reviewStatus' sont présents dans le body pour une classe APPROVED.
          const { id: _, reviewStatus: __, issuerName: ___, programName: ____, ...patchBody } = loyaltyClass;
          
          logger.info(`🔄 Envoi PATCH (Nettoyé) à Google Wallet pour ${classId}`);
          logger.debug(`PatchBody: ${JSON.stringify(patchBody, null, 2)}`);
          
          await this.client.loyaltyclass.patch({ resourceId: classId, requestBody: patchBody });
          logger.info(`✅ Classe Google Wallet mise à jour avec succès: ${classId}`);
        } catch (patchErr) {
          const errMsg = patchErr.message || '';
          const googleErrors = patchErr.errors || (patchErr.response?.data?.error?.errors);
          
          logger.warn(`⚠️ Échec du PATCH Google Wallet (${classId}): ${errMsg}`);
          if (googleErrors) {
            logger.warn(`Détails erreurs Google: ${JSON.stringify(googleErrors, null, 2)}`);
          }
          
          // Fallback minimaliste si l'erreur persiste (on ne change que les couleurs et logo)
          if (errMsg.includes('Invalid review status') || patchErr.code === 400) {
            try {
               const minimalBody = {
                 hexBackgroundColor: loyaltyClass.hexBackgroundColor,
                 programLogo: loyaltyClass.programLogo
               };
               if (loyaltyClass.heroImage) minimalBody.heroImage = loyaltyClass.heroImage;
               
               logger.info(`🔄 Tentative de PATCH minimaliste (couleurs/images uniquement) pour ${classId}`);
               await this.client.loyaltyclass.patch({ resourceId: classId, requestBody: minimalBody });
               logger.info(`✅ PATCH minimaliste réussi pour ${classId}`);
            } catch (minErr) {
               logger.warn(`Échec du patch minimaliste: ${minErr.message}. On poursuit.`);
            }
          } else {
            throw patchErr;
          }
        }
      } catch (err) {
        if (err.code === 404) {
          logger.info(`Création de la classe: ${classId}`);
          // Pour l'insertion, on peut ajouter UNDER_REVIEW par défaut
          const insertBody = { ...loyaltyClass, reviewStatus: 'UNDER_REVIEW' };
          await this.client.loyaltyclass.insert({ requestBody: insertBody });
        } else {
          throw err;
        }
      }

      // Synchronisation déjà gérée par l'ID principal désormais unifié
      
      return classId;
    } catch (err) {
      // FALLBACK BLINDÉ: Si Google rejette les images (tunnel local)
      if (err.message && (err.message.toLowerCase().includes('image cannot be loaded') || err.message.includes('400'))) {
        logger.warn('⚠️ Échec probable de validation d\'image Google ou erreur 400. Tentative de fallback minimal.');
        const fallbackClass = { ...loyaltyClass };
        delete fallbackClass.heroImage;
        delete fallbackClass.id;
        fallbackClass.programLogo = {
          sourceUri: { uri: 'https://www.gstatic.com/images/branding/product/2x/wallet_48dp.png' }
        };

        try {
          try {
             await this.client.loyaltyclass.patch({ resourceId: classId, requestBody: fallbackClass });
          } catch (pErr) {
             if (pErr.code === 404) {
               // Fallback pour insertion si 404
                await this.client.loyaltyclass.insert({ requestBody: { ...fallbackClass, id: classId, reviewStatus: 'UNDER_REVIEW' } });
             } else { 
               logger.warn('Échec mise à jour fallback, poursuite avec classe existante.');
             }
          }
          return classId;
        } catch (finalErr) {
          logger.error('Échec critique du fallback Google Wallet:', finalErr);
          throw finalErr;
        }
      }
      throw err;
    }
  }

  async createLoyaltyObject(clientId, empresaId, clientName, currentPoints, config, loyaltyType = 'points') {
    if (!this.client || !this.credentials) return null;

    const classId = `${this.issuerId}.${empresaId}_loyalty_class`;
    const objectId = `${this.issuerId}.${clientId}_loyalty_object`;

    const loyaltyObject = {
      id: objectId,
      classId: classId,
      accountId: clientId.toString(),
      accountName: clientName,
      state: 'ACTIVE',
      loyaltyPoints: {
        label: (config.loyalty_type === 'stamps' ? 'Tampons' : 'Points'),
        balance: { string: currentPoints.toString() }
      },
      barcode: {
        type: 'QR_CODE',
        value: clientId.toString(),
        alternateText: clientId.toString()
      }
    };

    // On désactive l'image hero sur les objets pour éviter les erreurs de timeout/chargement Google
    // qui bloquent la redirection sur les tunnels locaux.

    try {
      const executeRequest = async (obj) => {
        try {
          await this.client.loyaltyobject.get({ resourceId: objectId });
          await this.client.loyaltyobject.update({ resourceId: objectId, requestBody: obj });
        } catch (getErr) {
          if (getErr.code === 404) {
            await this.client.loyaltyobject.insert({ requestBody: obj });
          } else {
            throw getErr;
          }
        }
      };

      try {
        await executeRequest(loyaltyObject);
      } catch (err) {
        // Fallback total si l'image pose problème (chargement impossible via tunnel)
        if (err.message && err.message.includes('image cannot be loaded') && loyaltyObject.heroImage) {
          logger.warn(`⚠️ Échec critique image pour ${objectId}, repli sans image pour garantir la redirection.`);
          const fallbackObject = { ...loyaltyObject };
          delete fallbackObject.heroImage;
          await executeRequest(fallbackObject);
          // On utilise l'objet sans image pour générer le lien de sauvegarde final
          return this._generateSaveLink(fallbackObject);
        } else {
          throw err;
        }
      }
      return this._generateSaveLink(loyaltyObject);
    } catch (err) {
      logger.error('Erreur lors de la création de l\'objet loyalty:', err);
      throw err;
    }
  }

  async updateLoyaltyPoints(clientId, newBalance, loyaltyType = 'points') {
    if (!this.client) return;
    const objectId = `${this.issuerId}.${clientId}_loyalty_object`;
    try {
      const requestBody = {
        loyaltyPoints: {
          balance: { string: newBalance.toString() }
        }
      };

      await this.client.loyaltyobject.patch({
        resourceId: objectId,
        requestBody
      });
      logger.info(`Points mis à jour sur Google Wallet pour ${clientId}: ${newBalance}`);
    } catch (err) {
      // Fallback Legacy si nécessaire, bien que l'ID soit maintenant unifié
      logger.error('Erreur mise à jour points Google:', err);
    }
  }

  _generateSaveLink(loyaltyObject) {
    const claims = {
      iss: this.credentials.client_email,
      aud: 'google',
      origins: [],
      typ: 'savetowallet',
      payload: {
        loyaltyObjects: [loyaltyObject]
      }
    };

    const token = jwt.sign(claims, this.credentials.private_key, { algorithm: 'RS256' });
    return `https://pay.google.com/gp/v/save/${token}`;
  }

  _getAbsoluteUrl(relativeUrl) {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    const baseUrl = (process.env.BACKEND_URL || '').replace(/\/$/, '');
    const cleanRelative = relativeUrl.replace(/^\//, '').replace(/^api\/uploads\//, 'uploads/');
    
    return `${baseUrl}/${cleanRelative}`;
  }
}

export default new GoogleWalletGenerator();
