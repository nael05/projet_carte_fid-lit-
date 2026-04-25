import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import logger from './logger.js';
import dotenv from 'dotenv';
import fs from 'fs';
import axios from 'axios';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

class GoogleWalletGenerator {
  constructor() {
    const rawPath = process.env.GOOGLE_WALLET_KEY_PATH || 'certs/google-wallet-key.json';
    
    // Résolution robuste du chemin absolu pour le fichier de clés Google
    this.keyFilePath = path.isAbsolute(rawPath) 
      ? rawPath 
      : path.resolve(__dirname, '..', rawPath);

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
      } else {
        logger.warn(`⚠️ Fichier de clés Google Wallet introuvable: ${this.keyFilePath}`);
      }
    } catch (err) {
      logger.error(`Erreur d'initialisation Google Wallet (Path: ${this.keyFilePath}):`, err);
    }
  }

  async createOrUpdateClass(empresaId, config, empresaName, loyaltyType = 'points') {
    if (!this.client) return null;

    // RETOUR À L'ID D'ORIGINE POUR LA STABILITÉ
    const classId = `${this.issuerId}.${empresaId}_loyalty_class`;
    
    const logoUrl = config.google_logo_url || config.logo_url;
    const heroImageUrl = config.google_hero_image_url;
    const bgColor = config.google_primary_color || '#1f2937';

    // Détection des fichiers locaux avant d'envoyer l'URL à Google pour éviter les erreurs 400
    const localLogoPath = logoUrl ? path.resolve(__dirname, '..', logoUrl.replace(/^api\/uploads\//, 'uploads/')) : null;
    const hasLocalLogo = localLogoPath && fs.existsSync(localLogoPath);

    let locationsArray = [];
    if (config.locations) {
      try {
        locationsArray = typeof config.locations === 'string'
          ? JSON.parse(config.locations)
          : config.locations;
      } catch (e) {}
    }

    const googleLocations = Array.isArray(locationsArray)
      ? locationsArray
          .filter(loc => {
            if (loc.latitude === '' || loc.latitude === null || loc.latitude === undefined) return false;
            if (loc.longitude === '' || loc.longitude === null || loc.longitude === undefined) return false;
            const lat = Number(loc.latitude);
            const lng = Number(loc.longitude);
            return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
          })
          .slice(0, 20)
          .map(loc => ({ latitude: Number(loc.latitude), longitude: Number(loc.longitude) }))
      : [];

    const loyaltyClass = {
      id: classId,
      issuerName: (empresaName || 'Fidelyz').substring(0, 50),
      programName: (config.google_card_title || config.card_title || 'Programme Fidélité').substring(0, 50),
      programLogo: hasLocalLogo ? {
        sourceUri: { uri: this._getAbsoluteUrl(logoUrl) }
      } : {
        sourceUri: { uri: 'https://www.gstatic.com/images/branding/product/2x/wallet_48dp.png' }
      },
      hexBackgroundColor: bgColor.startsWith('#') ? bgColor : `#${bgColor}`,
      textModulesData: [
        {
          header: 'Informations',
          body: config.google_card_subtitle || config.card_subtitle || 'Votre carte de fidélité numérique.',
          id: 'subtitle_module'
        }
      ]
    };

    if (googleLocations.length > 0) {
      loyaltyClass.locations = googleLocations;
      logger.info(`📍 [GOOGLE LOC] ${googleLocations.length} localisation(s) configurée(s) pour la classe ${classId}`);
    }

    const localHeroPath = heroImageUrl ? path.resolve(__dirname, '..', heroImageUrl.replace(/^api\/uploads\//, 'uploads/')) : null;
    const hasLocalHero = localHeroPath && fs.existsSync(localHeroPath);

    if (hasLocalHero) {
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
          // reviewStatus: 'UNDER_REVIEW' est obligatoire pour patcher une classe en état APPROVED
          const { id: _, ...patchBody } = loyaltyClass;
          patchBody.reviewStatus = 'UNDER_REVIEW';

          logger.info(`🔄 Mise à jour du style Google Wallet (${classId})...`);
          logger.debug(`PatchBody envoyé: ${JSON.stringify(patchBody)}`);

          await this.client.loyaltyclass.patch({ resourceId: classId, requestBody: patchBody });
          logger.info(`✅ Design Google Wallet mis à jour avec succès!`);
        } catch (patchErr) {
          const errMsg = patchErr.message || '';
          logger.warn(`⚠️ Échec de la mise à jour complète Google Wallet: ${errMsg}`);
          logger.warn(`⚠️ Détail complet erreur PATCH classe: ${JSON.stringify(patchErr, Object.getOwnPropertyNames(patchErr), 2)}`);

          // Fallback : titre + sous-titre + couleur + logo (sans heroImage)
          try {
             const minimalBody = {
               issuerName: loyaltyClass.issuerName,
               programName: loyaltyClass.programName,
               hexBackgroundColor: loyaltyClass.hexBackgroundColor,
               textModulesData: loyaltyClass.textModulesData,
               programLogo: loyaltyClass.programLogo,
               reviewStatus: 'UNDER_REVIEW'
             };
             if (googleLocations.length > 0) minimalBody.locations = googleLocations;

             logger.info(`🔄 Tentative de mise à jour sans hero image...`);
             await this.client.loyaltyclass.patch({ resourceId: classId, requestBody: minimalBody });
             logger.info(`✅ Mise à jour sans hero image réussie.`);
          } catch (minErr) {
             logger.warn(`⚠️ Échec mise à jour sans hero: ${minErr.message}`);
             // Dernier recours : titre + sous-titre + couleur (sans images)
             try {
               await this.client.loyaltyclass.patch({
                 resourceId: classId,
                 requestBody: {
                   issuerName: loyaltyClass.issuerName,
                   programName: loyaltyClass.programName,
                   hexBackgroundColor: loyaltyClass.hexBackgroundColor,
                   textModulesData: loyaltyClass.textModulesData,
                   reviewStatus: 'UNDER_REVIEW'
                 }
               });
               logger.info('✅ Titre + couleur mis à jour (fallback sans images).');
             } catch (colorErr) {
               logger.error(`❌ Échec total de mise à jour du style: ${colorErr.message}`);
             }
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
        logger.warn('⚠️ Échec probable de validation d\'image Google ou erreur 400. Tentative de fallback sans images.');
        const fallbackClass = {
          issuerName: loyaltyClass.issuerName,
          programName: loyaltyClass.programName,
          hexBackgroundColor: loyaltyClass.hexBackgroundColor,
          textModulesData: loyaltyClass.textModulesData,
          programLogo: { sourceUri: { uri: 'https://www.gstatic.com/images/branding/product/2x/wallet_48dp.png' } },
          reviewStatus: 'UNDER_REVIEW'
        };

        try {
          try {
            await this.client.loyaltyclass.patch({ resourceId: classId, requestBody: fallbackClass });
          } catch (pErr) {
            if (pErr.code === 404) {
              await this.client.loyaltyclass.insert({ requestBody: { ...fallbackClass, id: classId } });
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

  async createLoyaltyObject(clientId, empresaId, clientName, currentPoints, config, rewardTiers = []) {
    if (!this.client || !this.credentials) return null;

    const classId = `${this.issuerId}.${empresaId}_loyalty_class`;
    const objectId = `${this.issuerId}.${clientId}_loyalty_object`;

    const textModulesData = [];
    if (Array.isArray(rewardTiers) && rewardTiers.length > 0) {
       const tiersList = rewardTiers.map(t => `- ${t.points_required} pts : ${t.title}`).join('\n');
       textModulesData.push({
          header: 'Vos Paliers de Récompenses',
          body: tiersList,
          id: 'rewards_module'
       });
    }
    if (config?.relevant_text) {
      textModulesData.push({
        header: 'OFFRE EN COURS',
        body: config.relevant_text,
        id: 'promo_module'
      });
    }

    const loyaltyObject = {
      id: objectId,
      classId: classId,
      accountId: clientId.toString(),
      accountName: clientName,
      state: 'ACTIVE',
      loyaltyPoints: {
        label: 'Points',
        balance: { string: currentPoints.toString() }
      },
      textModulesData: textModulesData,
      barcode: {
        type: 'QR_CODE',
        value: clientId.toString(),
        alternateText: clientId.toString()
      }
    };

    // Liens cliquables (contact, réseaux sociaux) et offre en cours depuis la config
    if (config) {
      const { linksModuleData } = this._buildLinksAndOfferModules(config);
      if (linksModuleData) loyaltyObject.linksModuleData = linksModuleData;
    }

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

  async addMessageToObject(clientId, header, body) {
    if (!this.client || !this.credentials) return;

    const objectId = `${this.issuerId}.${clientId}_loyalty_object`;
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;

    await db.query(
      'DELETE FROM google_wallet_message_log WHERE object_id = ? AND sent_at <= ?',
      [objectId, cutoff]
    );

    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM google_wallet_message_log WHERE object_id = ? AND sent_at > ?',
      [objectId, cutoff]
    );

    if (count >= 3) {
      logger.warn(`⚠️ [GOOGLE MSG] Quota 3/24h atteint pour ${objectId}`);
      return;
    }

    await db.query(
      'INSERT INTO google_wallet_message_log (object_id, sent_at) VALUES (?, ?)',
      [objectId, now]
    );

    try {
      const auth = new GoogleAuth({
        credentials: this.credentials,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      });
      const accessToken = await auth.getAccessToken();

      await axios.post(
        `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(objectId)}/addMessage`,
        {
          message: {
            header,
            body,
            id: `msg_${now}`,
            messageType: 'TEXT_AND_NOTIFY'
          }
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`✅ [GOOGLE MSG] Notification envoyée à ${objectId}`);
    } catch (err) {
      await db.query(
        'DELETE FROM google_wallet_message_log WHERE object_id = ? AND sent_at = ? LIMIT 1',
        [objectId, now]
      );

      if (err.response?.status === 404) {
        logger.warn(`⚠️ [GOOGLE MSG] Object ${objectId} introuvable`);
        return;
      }
      logger.error(`❌ [GOOGLE MSG] Erreur addMessage ${objectId}: ${err.message}`);
      throw err;
    }
  }

  async updateLoyaltyObject(clientId, empresaId, newBalance, rewardTiers = [], config = null) {
    if (!this.client) return;
    const objectId = `${this.issuerId}.${clientId}_loyalty_object`;

    const textModulesData = [];
    if (Array.isArray(rewardTiers) && rewardTiers.length > 0) {
      const tiersList = rewardTiers.map(t => `- ${t.points_required} pts : ${t.title}`).join('\n');
      textModulesData.push({
        header: 'Vos Paliers de Récompenses',
        body: tiersList,
        id: 'rewards_module'
      });
    }
    if (config?.relevant_text) {
      textModulesData.push({
        header: 'OFFRE EN COURS',
        body: config.relevant_text,
        id: 'promo_module'
      });
    }

    const patchBody = {
      loyaltyPoints: {
        label: 'Points',
        balance: { string: newBalance.toString() }
      },
      textModulesData
    };

    if (config) {
      const { linksModuleData } = this._buildLinksAndOfferModules(config);
      if (linksModuleData) patchBody.linksModuleData = linksModuleData;
    }

    try {
      await this.client.loyaltyobject.patch({
        resourceId: objectId,
        requestBody: patchBody
      });
      logger.info(`✅ [GOOGLE] PATCH ${objectId}: ${newBalance} pts + ${rewardTiers.length} paliers`);
    } catch (err) {
      if (err.code === 404) {
        logger.warn(`⚠️ [GOOGLE] Object ${objectId} introuvable - pass non encore créé pour ce client?`);
        return;
      }
      logger.error(`❌ [GOOGLE] Erreur PATCH ${objectId}: ${err.message}`);
      throw err;
    }
  }

  _generateSaveLink(loyaltyObject) {
    if (!this.credentials || !this.credentials.client_email || !this.credentials.private_key) {
      if (this.credentials) {
        logger.error('❌ Impossible de générer le lien de sauvegarde Google Wallet: identifiants manquants (client_email ou private_key).');
      } else {
        logger.error('❌ Impossible de générer le lien de sauvegarde Google Wallet: credentials est null (fichier de clés manquant).');
      }
      return null;
    }

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

  _buildSocialUrl(input, platform) {
    if (!input || typeof input !== 'string') return null;
    const clean = input.trim();
    if (!clean) return null;
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    const handle = clean.startsWith('@') ? clean.substring(1) : clean;
    if (platform === 'instagram') return `https://instagram.com/${handle}`;
    if (platform === 'facebook') return `https://facebook.com/${handle}`;
    if (platform === 'tiktok') return `https://tiktok.com/@${handle}`;
    return null;
  }

  _buildLinksAndOfferModules(config) {
    const uris = [];

    if (config.google_back_phone) {
      const phone = config.google_back_phone.replace(/\s/g, '');
      uris.push({ uri: `tel:${phone}`, description: 'Téléphone', id: 'link_phone' });
    }
    if (config.google_back_website) {
      let url = config.google_back_website.trim();
      if (!url.startsWith('http')) url = `https://${url}`;
      uris.push({ uri: url, description: 'Site Web', id: 'link_website' });
    }
    if (config.google_back_address) {
      const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(config.google_back_address)}`;
      uris.push({ uri: mapsUrl, description: 'Adresse', id: 'link_address' });
    }
    const instagram = this._buildSocialUrl(config.google_back_instagram, 'instagram');
    if (instagram) uris.push({ uri: instagram, description: 'Instagram', id: 'link_instagram' });
    const facebook = this._buildSocialUrl(config.google_back_facebook, 'facebook');
    if (facebook) uris.push({ uri: facebook, description: 'Facebook', id: 'link_facebook' });
    const tiktok = this._buildSocialUrl(config.google_back_tiktok, 'tiktok');
    if (tiktok) uris.push({ uri: tiktok, description: 'TikTok', id: 'link_tiktok' });

    if (config.google_review_url) {
      let reviewUrl = config.google_review_url.trim();
      if (!reviewUrl.startsWith('http')) reviewUrl = `https://${reviewUrl}`;
      uris.push({ uri: reviewUrl, description: 'Laissez-nous un avis Google', id: 'link_review_google' });
    }

    const linksModuleData = uris.length > 0 ? { uris } : null;
    return { linksModuleData };
  }

  _getAbsoluteUrl(relativeUrl) {
    if (!relativeUrl || typeof relativeUrl !== 'string') return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    const baseUrl = (process.env.BACKEND_URL || '').replace(/\/$/, '');
    const cleanRelative = relativeUrl.replace(/^\//, '').replace(/^api\/uploads\//, 'uploads/');
    
    return `${baseUrl}/${cleanRelative}`;
  }
}

export default new GoogleWalletGenerator();
