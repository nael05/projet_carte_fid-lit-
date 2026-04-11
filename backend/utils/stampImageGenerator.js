/**
 * stampImageGenerator.js
 * Génère dynamiquement une image "strip" pour Apple Wallet
 * avec une GRILLE de tampons visuels (gros cercles type carte de fidélité)
 */

import sharp from 'sharp';
import logger from './logger.js';

/**
 * Génère une image strip (375x144) avec une grille de tampons visuels.
 * @param {number} collected - Nombre de tampons collectés
 * @param {number} total - Nombre total de tampons (ex: 10)
 * @param {string} filledColor - Couleur hex des tampons remplis
 * @param {string} emptyColor - Couleur hex des tampons vides
 * @param {string} bgColor - Couleur de fond (utilisée si pas d'image)
 * @param {Buffer} backgroundImageBuffer - Buffer d'une image de fond à superposer
 * @returns {Promise<Buffer>} - Buffer PNG de l'image strip
 */
export async function generateStampStrip(collected, total = 10, filledColor = '#3b82f6', emptyColor = '#4b5563', bgColor = '#1f2937', backgroundImageBuffer = null) {
  try {
    const width = 375;
    const height = 144;

    // Calcul de la grille (même logique)
    let cols, rows;
    if (total <= 6) { cols = 3; rows = Math.ceil(total / cols); }
    else if (total <= 10) { cols = 5; rows = Math.ceil(total / cols); }
    else if (total <= 12) { cols = 4; rows = Math.ceil(total / cols); }
    else { cols = 5; rows = Math.ceil(total / cols); }

    const paddingX = 20;
    const paddingTop = 12;
    const circleRadius = 18;
    const circleDiameter = circleRadius * 2;
    const spacingX = (width - paddingX * 2 - cols * circleDiameter) / (cols - 1);
    const totalGridHeight = rows * circleDiameter;
    const spacingY = rows > 1 ? (height - paddingTop * 2 - totalGridHeight) / (rows - 1) : 0;
    const startY = paddingTop + (height - paddingTop * 2 - totalGridHeight - spacingY * (rows - 1)) / 2;

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
          <circle cx="${cx}" cy="${cy}" r="${circleRadius}" fill="${emptyColor}" opacity="0.5" />
          <circle cx="${cx}" cy="${cy}" r="${circleRadius - 1}" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.5" />
        `;
      }
    }

    // Le SVG ne contient QUE les cercles (pas de fond si on a une image)
    const svgOverlay = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${circles}
      </svg>
    `;

    if (backgroundImageBuffer) {
      // 1. Préparer le fond (redimensionner et obscurcir un peu pour la lisibilité)
      const base = await sharp(backgroundImageBuffer)
        .resize(width, height, { fit: 'cover' })
        .modulate({ brightness: 0.85 })
        .toBuffer();

      // 2. Superposer les tampons par-dessus
      return await sharp(base)
        .composite([{ input: Buffer.from(svgOverlay), blend: 'over' }])
        .png()
        .toBuffer();
    } else {
      // Pas d'image -> Fond plein classique
      const fullSvg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${width}" height="${height}" fill="${bgColor}" />
          ${circles}
        </svg>
      `;
      return await sharp(Buffer.from(fullSvg)).png().toBuffer();
    }
  } catch (error) {
    logger.error(`❌ Erreur génération strip tampons: ${error.message}`);
    return null;
  }
}
