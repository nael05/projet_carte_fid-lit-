/**
 * stampImageGenerator.js
 * Génère dynamiquement une image "strip" pour Apple Wallet
 * avec une GRILLE de tampons visuels (gros cercles type carte de fidélité)
 */

import sharp from 'sharp';
import logger from './logger.js';

/**
 * Génère une image strip (750x490 @2x) avec une grille de tampons visuels.
 * Les tampons collectés sont remplis avec la couleur accent,
 * les tampons non collectés sont des cercles gris foncé.
 * 
 * @param {number} collected - Nombre de tampons collectés
 * @param {number} total - Nombre total de tampons (ex: 10)
 * @param {string} filledColor - Couleur hex des tampons remplis (ex: "#3b82f6")
 * @param {string} emptyColor - Couleur hex des tampons vides (ex: "#374151")
 * @param {string} bgColor - Couleur de fond hex (ex: "#1f2937")
 * @returns {Promise<Buffer>} - Buffer PNG de l'image strip
 */
export async function generateStampStrip(collected, total = 10, filledColor = '#3b82f6', emptyColor = '#4b5563', bgColor = '#1f2937') {
  try {
    // Apple Wallet storeCard strip: EXACTEMENT 375x144 @1x
    const width = 375;
    const height = 144;

    // Calculer la grille
    let cols, rows;
    if (total <= 6) {
      cols = 3; rows = Math.ceil(total / cols);
    } else if (total <= 10) {
      cols = 5; rows = Math.ceil(total / cols);
    } else if (total <= 12) {
      cols = 4; rows = Math.ceil(total / cols);
    } else {
      cols = 5; rows = Math.ceil(total / cols);
    }

    const paddingX = 20;
    const paddingTop = 12;
    const circleRadius = 18;
    const circleDiameter = circleRadius * 2;

    // Espacement dynamique
    const spacingX = (width - paddingX * 2 - cols * circleDiameter) / (cols - 1);
    const totalGridHeight = rows * circleDiameter;
    const spacingY = rows > 1 ? (height - paddingTop * 2 - totalGridHeight) / (rows - 1) : 0;
    const startY = paddingTop + (height - paddingTop * 2 - totalGridHeight - spacingY * (rows - 1)) / 2;

    // Construire les cercles SVG
    let circles = '';
    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = paddingX + circleRadius + col * (circleDiameter + spacingX);
      const cy = startY + circleRadius + row * (circleDiameter + spacingY);
      const isFilled = i < collected;

      if (isFilled) {
        circles += `
          <circle cx="${cx}" cy="${cy}" r="${circleRadius}" fill="${filledColor}" opacity="0.95" />
          <circle cx="${cx}" cy="${cy}" r="${circleRadius - 2}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
          <polyline points="${cx - 7},${cy} ${cx - 2},${cy + 6} ${cx + 8},${cy - 6}" 
                    fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        `;
      } else {
        circles += `
          <circle cx="${cx}" cy="${cy}" r="${circleRadius}" fill="${emptyColor}" opacity="0.45" />
          <circle cx="${cx}" cy="${cy}" r="${circleRadius - 2}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.8" />
        `;
      }
    }

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="${bgColor}" />
        ${circles}
      </svg>
    `;

    const buffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    logger.info(`🎯 Image strip tampons générée: ${collected}/${total}`);
    return buffer;
  } catch (error) {
    logger.error(`❌ Erreur génération strip tampons: ${error.message}`);
    return null;
  }
}

export default { generateStampStrip };
