// utils/googleWalletManager.js
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

class GoogleWalletManager {
  constructor() {
    this.credentialsPath = process.env.GOOGLE_WALLET_KEY_PATH || './certs/google-wallet-key.json';
    this.credentials = null;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.loadCredentials();
  }

  loadCredentials() {
    try {
      if (!fs.existsSync(this.credentialsPath)) {
        console.warn(`⚠️  Google Wallet credentials not found at ${this.credentialsPath}`);
        return false;
      }
      const data = fs.readFileSync(this.credentialsPath, 'utf8');
      this.credentials = JSON.parse(data);
      console.log('✅ Google Wallet credentials loaded');
      return true;
    } catch (err) {
      console.error('❌ Erreur chargement Google Wallet credentials:', err.message);
      return false;
    }
  }

  async getAccessToken() {
    // Si on a déjà un token valide, le réutiliser
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.credentials) {
      throw new Error('Google Wallet credentials not loaded');
    }

    try {
      const payload = {
        iss: this.credentials.client_email,
        sub: this.credentials.client_email,
        aud: this.credentials.token_uri,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // Valide 1h
      };

      const token = jwt.sign(payload, this.credentials.private_key, { algorithm: 'RS256' });

      const response = await fetch(this.credentials.token_uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: token,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Renouveler 1min avant expiration

      return this.accessToken;
    } catch (err) {
      console.error('❌ Erreur obtention access token Google:', err.message);
      throw err;
    }
  }

  async createWalletPass(clientData, customization, loyaltyType) {
    try {
      const token = await this.getAccessToken();
      const issuerId = this.credentials.client_email.split('@')[0];
      
      // Utiliser le Class ID personnalisé ou générer un par défaut
      const baseClassId = customization?.wallet_class_id || `loyalty_${loyaltyType}`;
      const classId = `${issuerId}.${baseClassId}`;
      const objectId = `${issuerId}.${clientData.id}`;

      // Traitement du template du code-barres
      const barcodeTemplate = customization?.wallet_barcode_text_template || 'ID: {clientId}';
      const barcodeText = barcodeTemplate.replace('{clientId}', clientData.id);

      // Structure du GenericClass pour Google Wallet
      const walletClass = {
        id: classId,
        issuerName: clientData.companyName,
        reviewStatus: 'UNDER_REVIEW',
        passConstraints: {
          nfcConstraint: [],
          screenshotEligibility: 'ELIGIBLE',
        },
        hexBackgroundColor: customization?.card_background_color || '#1f2937',
        cardColorSettings: {
          primaryColor: {
            red: this.hexToRgb(customization?.card_accent_color || '#3b82f6').r / 255,
            green: this.hexToRgb(customization?.card_accent_color || '#3b82f6').g / 255,
            blue: this.hexToRgb(customization?.card_accent_color || '#3b82f6').b / 255,
          },
        },
        textModulesData: [
          {
            header: loyaltyType === 'points' ? 'Points' : 'Tampons',
            body: '0',
            id: 'loyalty_balance',
          },
          {
            header: 'Titulaire',
            body: `${clientData.prenom} ${clientData.nom}`,
            id: 'cardholder',
          },
        ],
      };

      // Structure du GenericObject pour Google Wallet
      const walletObject = {
        id: objectId,
        classId: classId,
        genericData: {
          title: {
            defaultValue: {
              language: 'fr',
              value: customization?.wallet_card_title || `${clientData.companyName} - Carte de Fidélité`,
            },
          },
          subtitle: {
            defaultValue: {
              language: 'fr',
              value: customization?.wallet_subtitle_text || 
                (loyaltyType === 'points' ? 'Accumule des points' : 'Collectionne des tampons'),
            },
          },
          cardTitle: {
            defaultValue: {
              language: 'fr',
              value: clientData.companyName,
            },
          },
          header: customization?.wallet_header_text
            ? {
                defaultValue: {
                  language: 'fr',
                  value: customization.wallet_header_text,
                },
              }
            : undefined,
          description: customization?.wallet_description_text
            ? {
                defaultValue: {
                  language: 'fr',
                  value: customization.wallet_description_text,
                },
              }
            : undefined,
          details: [
            {
              label: loyaltyType === 'points' ? 'Points' : 'Tampons',
              fields: [
                {
                  fieldPath: 'object.textModulesData[0]',
                },
              ],
            },
            {
              label: 'Informations',
              fields: [
                {
                  fieldPath: 'object.textModulesData[1]',
                },
              ],
            },
          ],
          barcode: {
            type: 'QR_CODE',
            value: clientData.id,
            alternateText: barcodeText,
          },
          heroImage: customization?.card_logo_url
            ? {
                contentDescription: {
                  defaultValue: {
                    language: 'fr',
                    value: `Logo ${clientData.companyName}`,
                  },
                },
                image: {
                  sourceUri: {
                    uri: customization.card_logo_url,
                  },
                },
              }
            : undefined,
        },
      };

      // Supprimer les propriétés undefined
      if (!walletObject.genericData.header) delete walletObject.genericData.header;
      if (!walletObject.genericData.description) delete walletObject.genericData.description;
      if (!walletObject.genericData.heroImage) delete walletObject.genericData.heroImage;

      // Créer ou mettre à jour la classe
      await fetch(
        `https://walletobjects.googleapis.com/walletobjects/v1/genericClass/${classId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(walletClass),
        }
      ).catch(() => {
        // La classe peut déjà exister, pas grave
      });

      // Créer l'objet de pass
      const response = await fetch(
        `https://walletobjects.googleapis.com/walletobjects/v1/genericObject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(walletObject),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Wallet API error: ${JSON.stringify(error)}`);
      }

      const createdObject = await response.json();
      
      // Générer le lien JWT pour ajouter à Google Wallet
      const jwtPayload = {
        iss: this.credentials.client_email,
        aud: 'google',
        origins: ['localhost:5000', 'localhost:3000', process.env.FRONTEND_URL || 'localhost:3000'],
        typ: 'savetowallet',
        payload: {
          genericObjects: [walletObject],
        },
      };

      const saveJwt = jwt.sign(jwtPayload, this.credentials.private_key, {
        algorithm: 'RS256',
        header: { kid: this.credentials.private_key_id },
      });

      return {
        success: true,
        objectId: objectId,
        classId: classId,
        saveUrl: `https://pay.google.com/gp/v/save/${saveJwt}`,
        jwt: saveJwt,
      };
    } catch (err) {
      console.error('❌ Erreur création Google Wallet pass:', err.message);
      throw err;
    }
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 31, g: 41, b: 55 }; // Couleur par défaut
  }
}

export default new GoogleWalletManager();
