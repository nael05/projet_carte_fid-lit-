import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';

const MODEL_DIR = path.resolve(process.cwd(), 'models', 'fidelyz.pass');
const CERT_DIR = path.resolve(process.cwd(), 'certs');

export async function generateAppleWalletPass(customerData, loyaltyData) {
  try {
    // 1. Charger les 3 fichiers indispensables
    const wwdr = fs.readFileSync(path.join(CERT_DIR, 'wwdr.pem'));
    const signerCert = fs.readFileSync(path.join(CERT_DIR, 'pass.pem'));
    const signerKey = fs.readFileSync(path.join(CERT_DIR, 'macle.key'));

    // 2. Initialiser le Pass
    const pass = new PKPass(MODEL_DIR, {
      wwdr: wwdr,
      signerCert: signerCert,
      signerKey: signerKey
      // Pas de mot de passe nécessaire car la clé macle.key n'en a pas
    });

    // 3. Définir les informations de base
    pass.serialNumber = customerData.id ? customerData.id.toString() : "123456";
    pass.authenticationToken = "token_secret_pour_maj_dynamiques";

    // 4. Configurer le QR Code
    pass.barcode = {
      message: customerData.barcodeMessage || pass.serialNumber,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1"
    };

    // 5. Remplir les champs dynamiques (à adapter selon votre pass.json)
    pass.primaryFields.push({
      key: "points",
      label: "POINTS FIDÉLITÉ",
      value: loyaltyData.points || 0
    });

    pass.secondaryFields.push({
      key: "name",
      label: "CLIENT",
      value: customerData.name || "Client Fidelyz"
    });

    // 6. Générer l'archive .pkpass finale
    const passBuffer = await pass.getAsBuffer();
    return passBuffer;

  } catch (error) {
    console.error("❌ Erreur critique lors de la génération du Pass :", error);
    throw error;
  }
}