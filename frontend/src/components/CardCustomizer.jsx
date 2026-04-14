import React, { useState, useEffect } from 'react';
import api from '../api';
import { Palette, ImageIcon, Info, Layout, CheckCircle2, AlertCircle, Loader2, Upload, RotateCw, Globe, FileText, ChevronRight, Smartphone, Apple } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import './CardCustomizer.css';

const CardCustomizer = ({ proInfo }) => {
  const [platform, setPlatform] = useState('apple');
  const [activeTab, setActiveTab] = useState('appearance');
  const [previewSide, setPreviewSide] = useState('front');
  const [config, setConfig] = useState({
    // Apple specific
    primary_color: '#1f2937',
    text_color: '#ffffff',
    accent_color: '#3b82f6',
    secondary_color: '#374151',
    logo_url: '',
    icon_url: '',
    strip_image_url: '',
    logo_text: '',
    card_title: 'Carte de Fidélité',
    card_subtitle: 'Merci de votre confiance',
    back_fields_info: '',
    back_fields_terms: '',
    back_fields_website: '',
    apple_organization_name: '',
    apple_pass_description: 'Votre carte de fidélité numérique',
    // Google specific
    google_primary_color: '#1f2937',
    google_text_color: '#ffffff',
    google_logo_url: '',
    google_hero_image_url: '',
    google_card_title: 'Carte Fidélité',
    google_card_subtitle: 'Scannez lors de votre passage',
    // Shared
    latitude: '',
    longitude: '',
    relevant_text: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState(null); // 'logo', 'icon', 'strip', 'hero'
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    if (proInfo?.id) {
      loadCustomization();
    }
  }, [proInfo]);

  const loadCustomization = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/pro/card-customization/${proInfo.id}?loyaltyType=${proInfo.loyalty_type || 'points'}`);
      
      // Update config with data or defaults
      setConfig(prev => ({
        ...prev,
        ...data,
        primary_color: data.primary_color || '#1f2937',
        text_color: data.text_color || '#ffffff',
        accent_color: data.accent_color || '#3b82f6',
        google_primary_color: data.google_primary_color || '#1f2937',
        google_text_color: data.google_text_color || '#ffffff',
        google_card_title: data.google_card_title || 'Carte Fidélité',
        apple_organization_name: data.apple_organization_name || proInfo.nom || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        relevant_text: data.relevant_text || ''
      }));
    } catch (err) {
      console.error('Error loading customization:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: client-side validation for type/size
    const formData = new FormData();
    formData.append('logo', file); // API expects key 'logo' even for icons/strips, let's keep it simple or change it

    setUploadingType(type);
    setStatus({ type: '', message: '' });
    
    try {
      const response = await api.post(`/pro/upload-logo?imageType=${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        let fieldName = '';
        if (type === 'logo') fieldName = platform === 'apple' ? 'logo_url' : 'google_logo_url';
        else if (type === 'icon') fieldName = 'icon_url';
        else if (type === 'strip') fieldName = 'strip_image_url';
        else if (type === 'hero') fieldName = 'google_hero_image_url';

        setConfig(prev => ({ ...prev, [fieldName]: response.data.url }));
        setStatus({ type: 'success', message: 'Image mise à jour ! N\'oubliez pas de sauvegarder.' });
      }
    } catch (err) {
      console.error('Upload error:', err);
      setStatus({ type: 'error', message: "Erreur lors de l'upload de l'image." });
    } finally {
      setUploadingType(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: '', message: '' });
    try {
      await api.put(`/pro/card-customization/${proInfo.id}?loyaltyType=${proInfo.loyalty_type || 'points'}`, config);
      setStatus({ type: 'success', message: 'Design de la carte enregistré avec succès !' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'Erreur lors de la sauvegarde.' });
    } finally {
      setSaving(false);
      // Auto-hide success message
      setTimeout(() => setStatus({type: '', message: ''}), 4000);
    }
  };

  const getContrastColor = (hexcolor) => {
    if (!hexcolor) return '#ffffff';
    // If it's not a hex color (like 'transparent' or similar), default to white or black
    if (!hexcolor.startsWith('#')) return '#000000';
    
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
  };

  const getMediaUrl = (url) => {
    if (!url) return null;
    
    // If it's already a full external URL, return as is
    if (url.startsWith('http') && !url.includes('localhost') && !url.includes('loca.lt')) {
      return url;
    }
    
    // Extract everything after /uploads/ or just the path if already relative
    const relativeMatch = url.match(/uploads\/.+/);
    const cleanPath = relativeMatch ? relativeMatch[0] : url.replace(/^\//, '');
    
    // Use API base URL directly (which already includes /api)
    let baseUrl = api.defaults.baseURL || '/api';
    baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if any
    
    return `${baseUrl}/${cleanPath}`;
  };

  if (loading) return (
    <div className="pro-loading">
      <Loader2 size={32} className="pro-spin" />
      <p>Synchronisation du studio de design...</p>
    </div>
  );

  return (
    <div className="customizer-container">
      
      {/* Settings Panel */}
      <div className="customizer-settings">
        
        {/* Platform Selector */}
        <div className="platform-selector">
          <button 
            className={`platform-btn apple ${platform === 'apple' ? 'active' : ''}`}
            onClick={() => { setPlatform('apple'); setActiveTab('appearance'); }}
          >
            <Apple size={20} /> Apple Wallet
          </button>
          <button 
            className={`platform-btn google ${platform === 'google' ? 'active' : ''}`}
            onClick={() => { setPlatform('google'); setActiveTab('appearance'); }}
          >
            <Smartphone size={20} /> Google Wallet
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="customizer-tabs">
          <button 
            className={`customizer-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={16} /> Apparence
          </button>
          <button 
            className={`customizer-tab ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            <ImageIcon size={16} /> Images
          </button>
          {platform === 'apple' && (
            <button 
              className={`customizer-tab ${activeTab === 'infos' ? 'active' : ''}`}
              onClick={() => setActiveTab('infos')}
            >
              <Info size={16} /> Verso
            </button>
          )}
          <button 
            className={`customizer-tab ${activeTab === 'proximity' ? 'active' : ''}`}
            onClick={() => setActiveTab('proximity')}
          >
            <Globe size={16} /> GPS & Notifs
          </button>
        </div>

        {/* Dynamic Settings Card */}
        <div className="settings-card">
          
          {/* APPLE APPEARANCE */}
          {platform === 'apple' && activeTab === 'appearance' && (
            <>


              <div className="settings-group">
                <label>Texte à côté du logo (Optionnel)</label>
                <input 
                  type="text" name="logo_text" 
                  value={config.logo_text} 
                  onChange={handleChange}
                  placeholder="Ex: Club Privilège"
                />
              </div>

              <div className="color-grid">
                <div className="settings-group">
                  <label>Couleur de Fond</label>
                  <div className="color-input-wrapper">
                    <input type="color" name="primary_color" value={config.primary_color} onChange={handleChange} />
                    <code>{config.primary_color}</code>
                  </div>
                </div>
                <div className="settings-group">
                  <label>Couleur du Texte</label>
                  <div className="color-input-wrapper">
                    <input type="color" name="text_color" value={config.text_color} onChange={handleChange} />
                    <code>{config.text_color}</code>
                  </div>
                </div>
                <div className="settings-group">
                  <label>Libellés (Labels)</label>
                  <div className="color-input-wrapper">
                    <input type="color" name="accent_color" value={config.accent_color} onChange={handleChange} />
                    <code>{config.accent_color}</code>
                  </div>
                </div>
              </div>


            </>
          )}

          {/* GOOGLE APPEARANCE */}
          {platform === 'google' && activeTab === 'appearance' && (
            <>
              <div className="settings-group">
                <label>Titre de la carte (Google Wallet)</label>
                <input 
                  type="text" name="google_card_title" 
                  value={config.google_card_title} 
                  onChange={handleChange}
                  placeholder="Carte Cadeau / Fidélité"
                />
              </div>

              <div className="settings-group">
                <label>Sous-titre (Description courte)</label>
                <input 
                  type="text" name="google_card_subtitle" 
                  value={config.google_card_subtitle} 
                  onChange={handleChange}
                  placeholder="Ex: Scannez lors de votre passage"
                />
              </div>

              <div className="color-grid">
                <div className="settings-group">
                  <label>Couleur d'accentuation</label>
                  <div className="color-input-wrapper">
                    <input type="color" name="google_primary_color" value={config.google_primary_color} onChange={handleChange} />
                    <code>{config.google_primary_color}</code>
                  </div>
                </div>
                <div className="settings-group">
                  <label>Couleur du Texte</label>
                  <div className="color-input-wrapper">
                    <input type="color" name="google_text_color" value={config.google_text_color} onChange={handleChange} />
                    <code>{config.google_text_color}</code>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'images' && (
            <div className="upload-grid">
              
              <div className="upload-item">
                <div className="upload-preview">
                  {platform === 'apple' 
                    ? (config.logo_url ? <img src={getMediaUrl(config.logo_url)} alt="Logo" /> : <Layout size={20} />)
                    : (config.google_logo_url ? <img src={getMediaUrl(config.google_logo_url)} alt="Logo" /> : <Layout size={20} />)
                  }
                </div>
                <div className="upload-controls">
                  <label>Logo de l'entreprise</label>
                  <span className="upload-hint">Format Paysage (max 160x50px)</span>
                  <label className="upload-btn">
                    <input type="file" hidden onChange={e => handleFileUpload(e, 'logo')} disabled={uploadingType === 'logo'} />
                    {uploadingType === 'logo' ? 'Envoi...' : 'Choisir un logo'}
                  </label>
                </div>
              </div>

              {platform === 'apple' ? (
                <>


                  <div className="upload-item">
                    <div className="upload-preview">
                      {config.strip_image_url ? <img src={getMediaUrl(config.strip_image_url)} alt="Strip" /> : <ImageIcon size={20} />}
                    </div>
                    <div className="upload-controls">
                      <label>Bannière Apple (Strip)</label>
                      <span className="upload-hint">Format 375x123px</span>
                      <label className="upload-btn">
                        <input type="file" hidden onChange={e => handleFileUpload(e, 'strip')} disabled={uploadingType === 'strip'} />
                        {uploadingType === 'strip' ? 'Envoi...' : 'Choisir une bannière'}
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="upload-item">
                  <div className="upload-preview">
                    {config.google_hero_image_url ? <img src={getMediaUrl(config.google_hero_image_url)} alt="Hero" /> : <ImageIcon size={20} />}
                  </div>
                  <div className="upload-controls">
                    <label>Image Android (Hero)</label>
                    <span className="upload-hint">Bannière 1032x336px (3:1)</span>
                    <label className="upload-btn">
                      <input type="file" hidden onChange={e => handleFileUpload(e, 'hero')} disabled={uploadingType === 'hero'} />
                      {uploadingType === 'hero' ? 'Envoi...' : 'Choisir une image'}
                    </label>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'proximity' && (
            <div className="proximity-settings">
              <div className="settings-header">
                <h3>Géolocalisation & Proximité</h3>
                <p>La carte s'affichera automatiquement sur l'écran verrouillé du client lorsqu'il sera à proximité.</p>
              </div>

              <div className="settings-grid">
                <div className="settings-group">
                  <label>Latitude</label>
                  <input 
                    type="number" step="any" name="latitude" 
                    value={config.latitude} 
                    onChange={handleChange}
                    placeholder="Ex: 48.8566"
                  />
                </div>
                <div className="settings-group">
                  <label>Longitude</label>
                  <input 
                    type="number" step="any" name="longitude" 
                    value={config.longitude} 
                    onChange={handleChange}
                    placeholder="Ex: 2.3522"
                  />
                </div>
              </div>

              <div className="settings-group">
                <label>Message de proximité (Écran verrouillé)</label>
                <input 
                  type="text" name="relevant_text" 
                  value={config.relevant_text} 
                  onChange={handleChange}
                  placeholder="Ex: Vous êtes proche de notre boutique !"
                  maxLength={100}
                />
                <span className="upload-hint">S'affichera sous la carte sur l'écran verrouillé.</span>
              </div>

              <div className="info-alert" style={{ marginTop: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px', color: '#60a5fa', fontSize: '0.85rem' }}>
                💡 <strong>Astuce :</strong> Vous pouvez trouver vos coordonnées sur Google Maps en faisant un clic droit sur votre adresse (les chiffres sont la latitude et la longitude).
              </div>
            </div>
          )}

          {activeTab === 'infos' && (
            <div className="upload-grid">
              <div className="settings-group">
                <label>Nom de l'organisation (En-tête Apple)</label>
                <input 
                  type="text" name="apple_organization_name" 
                  value={config.apple_organization_name} 
                  onChange={handleChange}
                  placeholder={proInfo.nom}
                />
              </div>

              <div className="settings-group">
                <label>Sous-titre de la carte</label>
                <input 
                  type="text" name="card_subtitle" 
                  value={config.card_subtitle} 
                  onChange={handleChange}
                  placeholder="Ex: Merci pour votre visite !"
                />
              </div>

              <div className="info-alert" style={{ marginTop: '1rem', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)', padding: '12px', borderRadius: '8px', color: '#ff6b6b', fontSize: '0.85rem' }}>
                ⚠️ <strong>Note :</strong> Ces informations sont importantes pour vos clients, mais vous avez choisi de les masquer de l'interface de personnalisation.
              </div>
            </div>
          )}

          {/* Feedback Message */}
          {status.message && (
            <div className={`pro-alert ${status.type === 'error' ? 'pro-alert-error' : 'pro-alert-success'}`}>
              {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{status.message}</span>
            </div>
          )}

          <button className="btn-premium-save" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="pro-spin" size={20} /> : <CheckCircle2 size={20} />}
            Enregistrer les réglages {platform === 'apple' ? 'Apple' : 'Google'}
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="customizer-preview">
        
        {platform === 'apple' ? (
          <>
            <div className="preview-toggle">
              <button className={previewSide === 'front' ? 'active' : ''} onClick={() => setPreviewSide('front')}>Recto</button>
              <button className={previewSide === 'back' ? 'active' : ''} onClick={() => setPreviewSide('back')}>Verso</button>
            </div>

            <div className={`apple-card ${previewSide === 'back' ? 'flipped' : ''}`} style={{ 
              backgroundColor: config.primary_color,
              color: config.text_color,
              '--stamp-color': config.accent_color,
              '--label-color': config.accent_color
            }}>
              
              {/* APPLE FRONT PREMIUM */}
              <div className="card-front">
                <div className="card-header-premium">
                  <div className="card-logo-area">
                    {config.logo_url && (
                      <img src={getMediaUrl(config.logo_url)} alt="Logo" className="card-logo" />
                    )}
                    <span className="card-logo-text">{config.logo_text || (!config.logo_url ? proInfo.nom : '')}</span>
                  </div>
                  <div className="card-points-header">
                     <span className="card-field-label">POINTS</span>
                     <span className="card-field-value">96</span>
                  </div>
                </div>

                <div className="card-strip-premium" style={{ 
                  backgroundImage: config.strip_image_url ? `url(${getMediaUrl(config.strip_image_url)})` : 'none',
                  backgroundColor: !config.strip_image_url ? 'rgba(0,0,0,0.1)' : ''
                }}>
                  {!config.strip_image_url && <div className="strip-placeholder">Bannière (Photo)</div>}
                </div>

                <div className="card-info-grid">
                  <div className="card-info-col">
                    <span className="card-field-label">BONJOUR</span>
                    <span className="card-field-value-lg">NAEL</span>
                  </div>
                  <div className="card-info-col text-right">
                    <span className="card-field-label">DÉTAILS DES RÉCOMPENSES</span>
                    <span className="card-field-value">Au dos 👆 ...</span>
                  </div>
                </div>

                <div className="card-barcode-premium">
                   <QRCodeCanvas 
                     value="https://fidelyzapp.fr/c/2BF10B" 
                     size={135}
                     level="H"
                     includeMargin={false}
                   />
                   <div className="barcode-id-premium">N° Carte : 2BF10B</div>
                </div>


              </div>

              {/* APPLE BACK */}
              <div className="card-back">
                <button className="btn-done-flip" onClick={() => setPreviewSide('front')}>Terminé</button>
                <div className="back-content">
                  <div className="back-header">
                    <h3 style={{ color: '#000', margin: 0 }}>Informations</h3>
                  </div>
                  <div className="back-item">
                    <h4>Conditions</h4>
                    <p>{config.back_fields_terms || "Cumulez des points pour obtenir des cadeaux."}</p>
                  </div>
                  <div className="back-item">
                    <h4>Description</h4>
                    <p>{config.back_fields_info || "Votre carte de fidélité numérique."}</p>
                  </div>
                  {config.back_fields_website && (
                    <div className="back-item">
                      <h4>Site Web</h4>
                      <p style={{ color: '#007aff', fontWeight: '600' }}>{config.back_fields_website} <ChevronRight size={14} style={{verticalAlign:'middle'}} /></p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="pro-hint" style={{textAlign:'center', marginTop: '1rem'}}>
              <RotateCw size={12} style={{marginRight:4}} />
              Aperçu Apple Wallet approximatif.
            </p>
          </>
        ) : (
          <>
            <div className="google-card" style={{ backgroundColor: config.google_primary_color || '#ffffff' }}>
              {/* Header: Icon + Org Name */}
              <div className="google-card-new-header">
                <div className="google-wallet-icon">
                  <svg viewBox="0 0 48 48" width="24" height="24">
                    <path fill="#4285F4" d="M40 12H8c-2.2 0-4 1.8-4 4v20c0 2.2 1.8 4 4 4h32c2.2 0 4-1.8 4-4V16c0-2.2-1.8-4-4-4z"/>
                    <path fill="#34A853" d="M40 12H8c-2.2 0-4 1.8-4 4v4h40v-4c0-2.2-1.8-4-4-4z"/>
                    <path fill="#FBBC05" d="M40 12H8c-2.2 0-4 1.8-4 4v8h40v-8c0-2.2-1.8-4-4-4z"/>
                    <path fill="#EA4335" d="M40 12H8c-2.2 0-4 1.8-4 4v12h40v-12c0-2.2-1.8-4-4-4z"/>
                  </svg>
                </div>
                <span className="google-org-name-top" style={{ color: getContrastColor(config.google_primary_color) }}>{proInfo.nom}</span>
              </div>

              <div className="google-card-content">
                {/* Large Title */}
                <h2 className="google-main-title" style={{ color: getContrastColor(config.google_primary_color) }}>
                   {config.google_card_title || 'Programme Fidélité'}
                </h2>

                {/* Points Section */}
                <div className="google-points-section">
                  <span className="google-points-label" style={{ color: getContrastColor(config.google_primary_color), opacity: 0.7 }}>Points</span>
                  <span className="google-points-value" style={{ color: getContrastColor(config.google_primary_color) }}>0</span>
                </div>

                {/* QR Code Section */}
                <div className="google-qr-container">
                  <div className="google-qr-box">
                    <div className="google-qr-mock-real"></div>
                  </div>
                  <span className="google-client-id-text" style={{ color: getContrastColor(config.google_primary_color), opacity: 0.6 }}>
                    {proInfo.id.substring(0, 30)}...
                  </span>
                </div>
              </div>

              <div className="google-footer-actions">
                 <div className="google-add-btn-minimal">
                    <img src="https://www.gstatic.com/wallet/apple-wallet-icons/en_US/add_to_google_wallet_wallet_button.png" alt="Add to Google Wallet" style={{ height: '36px' }} />
                 </div>
              </div>
            </div>
            <p className="pro-hint" style={{textAlign:'center', marginTop: '1rem'}}>
               <Smartphone size={12} style={{marginRight:4}} />
               Aperçu Google Wallet fidèle au modèle officiel.
            </p>
          </>
        )}
      </div>

    </div>
  );
};

export default CardCustomizer;
