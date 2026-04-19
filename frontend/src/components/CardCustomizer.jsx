import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Palette, ImageIcon, Info, Layout, CheckCircle2, AlertCircle, Loader2, Upload, RotateCw,
  Globe, FileText, ChevronRight, Smartphone, Apple, User, PhoneCall, Share2,
  ShieldCheck, Phone, MapPin
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import './CardCustomizer.css';

const CardCustomizer = ({ proInfo, onSaveSuccess }) => {
  const [platform, setPlatform] = useState('apple');
  const [activeTab, setActiveTab] = useState('appearance');
  const [previewSide, setPreviewSide] = useState('front');
  const [config, setConfig] = useState({
    primary_color: '#1f2937',
    text_color: '#ffffff',
    accent_color: '#3b82f6',
    secondary_color: '#374151',
    logo_url: '',
    icon_url: '',
    strip_image_url: '',
    logo_text: '',
    card_subtitle: '',
    card_title: '',
    back_fields_info: '',
    back_fields_terms: '',
    back_fields_website: '',
    back_fields_phone: '',
    back_fields_address: '',
    back_fields_instagram: '',
    back_fields_facebook: '',
    back_fields_tiktok: '',
    apple_organization_name: '',
    apple_pass_description: '',
    apple_background_color: '',
    apple_text_color: '',
    apple_label_color: '',
    apple_logo_url: '',
    apple_icon_url: '',
    apple_strip_image_url: '',
    latitude: '',
    longitude: '',
    relevant_text: '',
    google_primary_color: '',
    google_text_color: '',
    google_logo_url: '',
    google_hero_image_url: '',
    google_card_title: '',
    google_card_subtitle: '',
    push_icon_url: '',
    dashboard_logo_url: ''
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

  useEffect(() => {
    if (activeTab === 'infos') {
      setPreviewSide('back');
    } else {
      setPreviewSide('front');
    }
  }, [activeTab]);

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
        else if (type === 'notification_icon') fieldName = 'push_icon_url';
        else if (type === 'dashboard_logo') fieldName = 'dashboard_logo_url';

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
      setStatus({ type: 'success', message: 'Design sauvegardé avec succès !' });
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'Erreur lors de la sauvegarde.' });
    } finally {
      setSaving(false);
      // Auto-hide success message
      setTimeout(() => setStatus({ type: '', message: '' }), 4000);
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
    if (url.startsWith('http')) return url;
    
    // Fallback robuste pour les chemins relatifs
    const cleanPath = url.replace(/^\//, '').replace(/^uploads\//, '');
    const baseUrl = (import.meta.env.VITE_API_URL || window.location.origin + '/api').replace(/\/$/, '');
    
    // On enlève le /api pour pointer directement vers /uploads
    return `${baseUrl.replace('/api', '')}/uploads/${cleanPath}`;
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
                    ? ((config.apple_logo_url || config.logo_url) ? <img src={getMediaUrl(config.apple_logo_url || config.logo_url)} alt="Logo" /> : <Layout size={20} />)
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
              {/* PROMO DU MOMENT (Design Screenshot) */}
              <div className="promo-setup-card" style={{ marginTop: '2rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                  <RotateCw size={24} className="pro-spin-on-hover" style={{ color: '#3b82f6' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', letterSpacing: '0.5px', color: '#fff' }}>PROMO DU MOMENT</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600' }}>(NOTIFICATION PUSH)</p>
                  </div>
                </div>

                <div className="settings-group" style={{ background: '#111827', padding: '1.2rem', borderRadius: '10px' }}>
                  <label style={{ fontSize: '0.9rem', marginBottom: '10px', display: 'block', fontWeight: '500' }}>Texte de la promotion</label>
                  <textarea
                    name="relevant_text"
                    value={config.relevant_text}
                    onChange={handleChange}
                    placeholder="Ex: -20% sur tout le magasin ce week-end !"
                    rows={3}
                    style={{ background: 'transparent', border: '1px solid #374151', borderRadius: '8px', width: '100%', padding: '12px', color: '#fff' }}
                  />
                  <p style={{ marginTop: '12px', fontSize: '0.8rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💡 La modification de ce champ déclenche une notification Push immédiate chez vos clients Apple.
                  </p>
                </div>
              </div>

              <div className="settings-header" style={{ marginTop: '2.5rem' }}>
                <h3>Géolocalisation & Proximité</h3>
                <p>La carte s'affichera automatiquement sur l'écran verrouillé lorsqu'il sera à proximité.</p>
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

              <div className="info-alert" style={{ marginTop: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px', color: '#60a5fa', fontSize: '0.85rem' }}>
                💡 <strong>Astuce :</strong> Vous pouvez trouver vos coordonnées sur Google Maps en faisant un clic droit sur votre adresse (les chiffres sont la latitude et la longitude).
              </div>
            </div>
          )}

          {activeTab === 'infos' && (
            <div className="customizer-settings-content">
              {/* GROUPE: CONFIGURATION DE BASE */}
              <div className="form-section">
                <div className="section-header">
                  <User size={18} />
                  <h3>Identité de votre Pass</h3>
                </div>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Nom de l'enseigne (En-tête)</label>
                    <input
                      type="text" name="apple_organization_name"
                      value={config.apple_organization_name || ''}
                      onChange={handleChange}
                      placeholder={proInfo.nom || "Votre établissement"}
                    />
                    <small className="field-hint">Nom affiché tout en haut de la carte.</small>
                  </div>
                  <div className="form-field">
                    <label>Sous-titre accrocheur</label>
                    <input
                      type="text" name="card_subtitle"
                      value={config.card_subtitle || ''}
                      onChange={handleChange}
                      placeholder="Ex: Passion & Fidélité"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Description (VoiceOver)</label>
                    <input
                      type="text" name="apple_pass_description"
                      value={config.apple_pass_description || ''}
                      onChange={handleChange}
                      placeholder="Ex: Carte de fidélité numérique pour vos avantages"
                    />
                  </div>
                </div>
              </div>

              {/* GROUPE: CONTACT & WEB */}
              <div className="form-section">
                <div className="section-header">
                  <PhoneCall size={18} />
                  <h3>Contact & Localisation</h3>
                </div>
                <div className="form-grid">
                  <div className="form-field">
                    <label><Phone size={14} /> Téléphone</label>
                    <input
                      type="text" name="back_fields_phone"
                      value={config.back_fields_phone || ''}
                      onChange={handleChange}
                      placeholder="01 23 45 67 89"
                    />
                  </div>
                  <div className="form-field">
                    <label><Globe size={14} /> Site Internet</label>
                    <input
                      type="text" name="back_fields_website"
                      value={config.back_fields_website || ''}
                      onChange={handleChange}
                      placeholder="www.votre-site.fr"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label><MapPin size={14} /> Adresse physique</label>
                    <input
                      type="text" name="back_fields_address"
                      value={config.back_fields_address || ''}
                      onChange={handleChange}
                      placeholder="Ex: 12 avenue des Champs, Paris"
                    />
                  </div>
                </div>
              </div>

              {/* GROUPE: RÉSEAUX SOCIAUX */}
              <div className="form-section">
                <div className="section-header">
                  <Share2 size={18} />
                  <h3>Présence Sociale</h3>
                </div>
                <div className="form-grid">
                  <div className="form-field">
                    <label><Share2 size={14} /> Instagram</label>
                    <input
                      type="text" name="back_fields_instagram"
                      value={config.back_fields_instagram || ''}
                      onChange={handleChange}
                      placeholder="@votrecompte"
                    />
                  </div>
                  <div className="form-field">
                    <label><Share2 size={14} /> Facebook</label>
                    <input
                      type="text" name="back_fields_facebook"
                      value={config.back_fields_facebook || ''}
                      onChange={handleChange}
                      placeholder="MaPageFidelyz"
                    />
                  </div>
                  <div className="form-field">
                    <label>TikTok</label>
                    <input
                      type="text" name="back_fields_tiktok"
                      value={config.back_fields_tiktok || ''}
                      onChange={handleChange}
                      placeholder="votrecompte"
                    />
                  </div>
                </div>
              </div>

              {/* GROUPE: LÉGAL */}
              <div className="form-section">
                <div className="section-header">
                  <ShieldCheck size={18} />
                  <h3>Informations Légales</h3>
                </div>
                <div className="form-grid">
                  <div className="form-field full-width">
                    <label>Conditions d'utilisation</label>
                    <textarea
                      name="back_fields_terms"
                      value={config.back_fields_terms || ''}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Expliquez ici les règles d'utilisation de la carte..."
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Infos complémentaires (Au dos)</label>
                    <textarea
                      name="back_fields_info"
                      value={config.back_fields_info || ''}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Ex: Valable dans tous nos points de vente."
                    />
                  </div>
                </div>
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
                    {(config.apple_logo_url || config.logo_url) && (
                      <img src={getMediaUrl(config.apple_logo_url || config.logo_url)} alt="Logo" className="card-logo" />
                    )}
                    <span className="card-logo-text">{config.logo_text || (!(config.apple_logo_url || config.logo_url) ? proInfo.nom : '')}</span>
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
              <div className="card-back" style={{ backgroundColor: '#111', color: '#fff' }}>
                <div className="back-content" style={{ padding: '1.2rem' }}>
                  <div className="back-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>Informations</h3>
                    <p style={{ margin: '4px 0 0', opacity: 0.6, fontSize: '0.8rem' }}>{config.apple_organization_name || proInfo.nom}</p>
                  </div>

                  <div className="back-scroll-area" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                    
                    {/* OFFRE EN COURS (PROMO) */}
                    {config.relevant_text && (
                      <div className="back-item-premium" style={{ marginBottom: '1.2rem', padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                        <span className="back-item-label" style={{ color: '#3b82f6' }}>OFFRE EN COURS</span>
                        <p className="back-item-value" style={{ fontWeight: '600' }}>{config.relevant_text}</p>
                      </div>
                    )}
                    {/* CONTACT */}
                    {(config.back_fields_phone || config.back_fields_website || config.back_fields_address) && (
                      <div className="back-item-group" style={{ marginBottom: '1.2rem' }}>
                        {config.back_fields_phone && (
                          <div className="back-item-premium">
                            <span className="back-item-label"><Phone size={12} /> TÉLÉPHONE</span>
                            <p className="back-item-value" style={{ color: '#007aff' }}>{config.back_fields_phone}</p>
                          </div>
                        )}
                        {config.back_fields_website && (
                          <div className="back-item-premium">
                            <span className="back-item-label"><Globe size={12} /> SITE WEB</span>
                            <p className="back-item-value" style={{ color: '#007aff' }}>{config.back_fields_website} <ChevronRight size={10} /></p>
                          </div>
                        )}
                        {config.back_fields_address && (
                          <div className="back-item-premium">
                            <span className="back-item-label"><MapPin size={12} /> ADRESSE</span>
                            <p className="back-item-value">{config.back_fields_address}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* RÉSEAUX SOCIAUX */}
                    {(config.back_fields_instagram || config.back_fields_facebook || config.back_fields_tiktok) && (
                      <div className="back-item-group" style={{ marginBottom: '1.2rem' }}>
                        <span className="back-group-title" style={{ fontSize: '0.7rem', opacity: 0.5, letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Réseaux Sociaux</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                          {config.back_fields_instagram && <div className="back-social-pill"><Share2 size={12} /> {config.back_fields_instagram}</div>}
                          {config.back_fields_facebook && <div className="back-social-pill"><Share2 size={12} /> Facebook</div>}
                          {config.back_fields_tiktok && <div className="back-social-pill">TikTok</div>}
                        </div>
                      </div>
                    )}

                    {/* TEXTES */}
                    <div className="back-item-premium">
                      <span className="back-item-label">DESCRIPTION</span>
                      <p className="back-item-value" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>{config.back_fields_info || "Votre carte de fidélité numérique."}</p>
                    </div>

                    <div className="back-item-premium" style={{ marginTop: '1rem' }}>
                      <span className="back-item-label">CONDITIONS</span>
                      <p className="back-item-value" style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: '1.4' }}>{config.back_fields_terms || "Cumulez des points pour obtenir des cadeaux."}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="pro-hint" style={{ textAlign: 'center', marginTop: '1rem' }}>
              <RotateCw size={12} style={{ marginRight: 4 }} />
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
                    <path fill="#4285F4" d="M40 12H8c-2.2 0-4 1.8-4 4v20c0 2.2 1.8 4 4 4h32c2.2 0 4-1.8 4-4V16c0-2.2-1.8-4-4-4z" />
                    <path fill="#34A853" d="M40 12H8c-2.2 0-4 1.8-4 4v4h40v-4c0-2.2-1.8-4-4-4z" />
                    <path fill="#FBBC05" d="M40 12H8c-2.2 0-4 1.8-4 4v8h40v-8c0-2.2-1.8-4-4-4z" />
                    <path fill="#EA4335" d="M40 12H8c-2.2 0-4 1.8-4 4v12h40v-12c0-2.2-1.8-4-4-4z" />
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
            <p className="pro-hint" style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Smartphone size={12} style={{ marginRight: 4 }} />
              Aperçu Google Wallet fidèle au modèle officiel.
            </p>
          </>
        )}
      </div>

    </div>
  );
};

export default CardCustomizer;
