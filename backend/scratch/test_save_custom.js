import pool from '../db.js';
import { randomUUID } from 'crypto';

async function testSave() {
  const [eRows] = await pool.query('SELECT id FROM entreprises LIMIT 1');
  if (eRows.length === 0) {
    console.error('No company found in DB');
    process.exit(1);
  }
  const empresaId = eRows[0].id;
  const loyaltyType = 'points';
  const customizationId = randomUUID();
  
  // Mock req.body
  const body = {
    primary_color: '#123456',
    text_color: '#ffffff',
    accent_color: '#ff0000',
    secondary_color: '#0000ff'
  };

  try {
    console.log('Testing INSERT...');
    await pool.query(
        `INSERT INTO card_customization 
         (id, company_id, loyalty_type, primary_color, text_color, accent_color, secondary_color,
          logo_url, icon_url, strip_image_url, logo_text, card_subtitle, card_title,
          back_fields_info, back_fields_terms, back_fields_website, apple_organization_name, apple_pass_description,
          apple_background_color, apple_text_color, apple_label_color, apple_logo_url, apple_icon_url, apple_strip_image_url,
          latitude, longitude, relevant_text,
          google_primary_color, google_text_color, google_logo_url,
          google_hero_image_url, google_card_title, google_card_subtitle)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customizationId, empresaId, loyaltyType, 
          body.primary_color || '#1f2937', body.text_color || '#ffffff', body.accent_color || '#3b82f6', body.secondary_color || '#374151',
          body.logo_url || null, body.icon_url || null, body.strip_image_url || null, body.logo_text || null, 
          body.card_subtitle || '', body.card_title || '',
          body.back_fields_info || null, body.back_fields_terms || null, body.back_fields_website || null, 
          body.apple_organization_name || null, body.apple_pass_description || null,
          body.apple_background_color || null, body.apple_text_color || null, body.apple_label_color || null,
          body.apple_logo_url || null, body.apple_icon_url || null, body.apple_strip_image_url || null,
          body.latitude || null, body.longitude || null, body.relevant_text || null,
          body.google_primary_color || '#1f2937', body.google_text_color || '#ffffff', body.google_logo_url || null,
          body.google_hero_image_url || null, body.google_card_title || '', body.google_card_subtitle || ''
        ]
    );
    console.log('INSERT successful!');

    console.log('Testing UPDATE...');
    await pool.query(
        `UPDATE card_customization SET 
         primary_color = ?, text_color = ?, accent_color = ?, secondary_color = ?,
         logo_url = ?, icon_url = ?, strip_image_url = ?, logo_text = ?, 
         card_subtitle = ?, card_title = ?, 
         back_fields_info = ?, back_fields_terms = ?, back_fields_website = ?,
         apple_organization_name = ?, apple_pass_description = ?,
         apple_background_color = ?, apple_text_color = ?, apple_label_color = ?,
         apple_logo_url = ?, apple_icon_url = ?, apple_strip_image_url = ?,
         latitude = ?, longitude = ?, relevant_text = ?,
         google_primary_color = ?, google_text_color = ?, google_logo_url = ?,
         google_hero_image_url = ?, google_card_title = ?, google_card_subtitle = ?,
         updated_at = NOW()
         WHERE company_id = ? AND loyalty_type = ?`,
        [
          body.primary_color || '#1f2937',
          body.text_color || '#ffffff',
          body.accent_color || '#3b82f6',
          body.secondary_color || '#374151',
          body.logo_url || null,
          body.icon_url || null,
          body.strip_image_url || null,
          body.logo_text || null,
          body.card_subtitle || '',
          body.card_title || '',
          body.back_fields_info || null,
          body.back_fields_terms || null,
          body.back_fields_website || null,
          body.apple_organization_name || null,
          body.apple_pass_description || null,
          body.apple_background_color || null,
          body.apple_text_color || null,
          body.apple_label_color || null,
          body.apple_logo_url || null,
          body.apple_icon_url || null,
          body.apple_strip_image_url || null,
          body.latitude || null,
          body.longitude || null,
          body.relevant_text || null,
          body.google_primary_color || '#1f2937',
          body.google_text_color || '#ffffff',
          body.google_logo_url || null,
          body.google_hero_image_url || null,
          body.google_card_title || '',
          body.google_card_subtitle || '',
          empresaId,
          loyaltyType
        ]
    );
    console.log('UPDATE successful!');
    
    // Cleanup
    await pool.query('DELETE FROM card_customization WHERE id = ?', [customizationId]);
    process.exit(0);
  } catch (err) {
    console.error('Error in test:', err.message);
    process.exit(1);
  }
}

testSave();
