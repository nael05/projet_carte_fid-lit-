import React, { useState, useEffect } from 'react';
import api from '../api';
import { Palette, ImageIcon, Info, Layout, CheckCircle2, AlertCircle, Loader2, Upload, RotateCw, Globe, FileText, ChevronRight } from 'lucide-react';
import './CardCustomizer.css';

const CardCustomizer = ({ proInfo }) => {
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
    card_title: 'Carte de Fidélité',
    card_subtitle: 'Merci de votre confiance',
    back_fields_info: '',
    back_fields_terms: '',
    back_fields_website: '',
    apple_organization_name: '',
    apple_pass_description: 'Votre carte de fidélité numérique'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState(null); // 'logo', 'icon', 'strip'
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
        card_title: data.card_title || 'Carte de Fidélité',
        apple_organization_name: data.apple_organization_name || proInfo.nom || ''
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
        const fieldName = type === 'logo' ? 'logo_url' : type === 'icon' ? 'icon_url' : 'strip_image_url';
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
          <button 
            className={`customizer-tab ${activeTab === 'infos' ? 'active' : ''}`}
            onClick={() => setActiveTab('infos')}
          >
            <Info size={16} /> Verso
          </button>
        </div>

        {/* Dynamic Settings Card */}
        <div className="settings-card">
          
          {activeTab === 'appearance' && (
            <>
              <div className="settings-group">
                <label>Nom de l'organisation (Apple Wallet)</label>
                <input 
                  type="text" name="apple_organization_name" 
                  value={config.apple_organization_name} 
                  onChange={handleChange}
                  placeholder={proInfo.nom}
                />
              </div>

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
                <div className="settings-group">
                  <label>Traits (Optionnel)</label>
                  <div className="color-input-wrapper">
                    <input type="color" name="secondary_color" value={config.secondary_color} onChange={handleChange} />
                    <code>{config.secondary_color}</code>
                  </div>
                </div>
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
            </>
          )}

          {activeTab === 'images' && (
            <div className="upload-grid">
              
              <div className="upload-item">
                <div className="upload-preview">
                  {config.logo_url ? <img src={config.logo_url} alt="Logo" /> : <Layout size={20} />}
                </div>
                <div className="upload-controls">
                  <label>Logo de l'entreprise</label>
                  <span className="upload-hint">Format Paysage (max 160x50px)</span>
                  <label className="upload-btn">
                    <input type="file" hidden onChange={e => handleFileUpload(e, 'logo')} disabled={uploadingType === 'logo'} />
                    {uploadingType === 'logo' ? 'Téléchargement...' : 'Choisir un logo'}
                  </label>
                </div>
              </div>

              <div className="upload-item">
                <div className="upload-preview">
                  {config.icon_url ? <img src={config.icon_url} alt="Icon" /> : <RotateCw size={20} />}
                </div>
                <div className="upload-controls">
                  <label>Icône de l'application</label>
                  <span className="upload-hint">Format Carré (min 29x29px)</span>
                  <label className="upload-btn">
                    <input type="file" hidden onChange={e => handleFileUpload(e, 'icon')} disabled={uploadingType === 'icon'} />
                    {uploadingType === 'icon' ? 'Téléchargement...' : 'Choisir une icône'}
                  </label>
                </div>
              </div>

              <div className="upload-item">
                <div className="upload-preview">
                  {config.strip_image_url ? <img src={config.strip_image_url} alt="Strip" /> : <ImageIcon size={20} />}
                </div>
                <div className="upload-controls">
                  <label>Image de fond (Strip)</label>
                  <span className="upload-hint">Bannière principale (375x123px)</span>
                  <label className="upload-btn">
                    <input type="file" hidden onChange={e => handleFileUpload(e, 'strip')} disabled={uploadingType === 'strip'} />
                    {uploadingType === 'strip' ? 'Téléchargement...' : 'Choisir une bannière'}
                  </label>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'infos' && (
            <div className="upload-grid">
              <div className="settings-group">
                <label><FileText size={14} style={{verticalAlign:'middle'}}/> Description (Accessibilité)</label>
                <input 
                  type="text" name="apple_pass_description" 
                  value={config.apple_pass_description} 
                  onChange={handleChange}
                  placeholder="Ex: Carte de fidélité numérique"
                />
              </div>

              <div className="settings-group">
                <label><Globe size={14} style={{verticalAlign:'middle'}}/> Votre Site Web</label>
                <input 
                  type="text" name="back_fields_website" 
                  value={config.back_fields_website} 
                  onChange={handleChange}
                  placeholder="https://votre-site.com"
                />
              </div>

              <div className="settings-group">
                <label>Conditions d'utilisation (Verso)</label>
                <textarea 
                  name="back_fields_terms" 
                  value={config.back_fields_terms} 
                  onChange={handleChange}
                  rows={4}
                  placeholder="Expliquez ici comment utiliser les points..."
                />
              </div>

              <div className="settings-group">
                <label>Informations Complémentaires</label>
                <textarea 
                  name="back_fields_info" 
                  value={config.back_fields_info} 
                  onChange={handleChange}
                  rows={3}
                  placeholder="Horaires, adresse, contact..."
                />
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
            Enregistrer le Design
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="customizer-preview">
        <div className="preview-toggle">
          <button className={previewSide === 'front' ? 'active' : ''} onClick={() => setPreviewSide('front')}>Recto</button>
          <button className={previewSide === 'back' ? 'active' : ''} onClick={() => setPreviewSide('back')}>Verso</button>
        </div>

        <div className={`apple-card ${previewSide === 'back' ? 'flipped' : ''}`} style={{ backgroundColor: config.primary_color }}>
          
          {/* FRONT */}
          <div className="card-front" style={{ color: config.text_color }}>
            <div className="card-header">
              <div className="card-logo-container">
                {config.logo_url && <img src={config.logo_url} alt="Logo" className="card-logo" />}
                {config.logo_text && <span className="card-logo-text">{config.logo_text}</span>}
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>{config.apple_organization_name || proInfo.nom}</span>
            </div>

            {config.strip_image_url ? (
              <div className="card-strip" style={{ backgroundImage: `url(${config.strip_image_url})` }}>
                <div className="strip-overlay"></div>
              </div>
            ) : (
              <div className="card-strip" style={{ background: 'rgba(255,255,255,0.05)' }}>
                 <ImageIcon opacity={0.2} />
              </div>
            )}

            <div className="card-body">
              <div>
                <div className="card-field-label" style={{ color: config.accent_color }}>{proInfo.loyalty_type === 'points' ? 'Points' : 'Tampons'}</div>
                <div className="card-field-value">{proInfo.loyalty_type === 'points' ? '12 / 20' : '● ● ● ○ ○'}</div>
              </div>
              <div>
                <div className="card-field-label" style={{ color: config.accent_color }}>Client</div>
                <div className="card-field-value" style={{ fontSize: '16px' }}>Jean Dupont</div>
              </div>
            </div>

            <div className="card-footer">
               <div style={{ fontSize: '11px', opacity: 0.7, textAlign: 'center' }}>{config.card_subtitle}</div>
               <div className="card-barcode">
                  <div className="barcode-mock">QR CODE</div>
               </div>
            </div>
          </div>

          {/* BACK */}
          <div className="card-back" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
            <div className="back-content">
              <h3>Détails de la Carte</h3>
              
              <div className="back-item">
                <h4>Conditions</h4>
                <p>{config.back_fields_terms || "Aucune condition spécifiée."}</p>
              </div>

              <div className="back-item">
                <h4>Informations</h4>
                <p>{config.back_fields_info || "Contactez l'entreprise pour plus d'infos."}</p>
              </div>

              {config.back_fields_website && (
                <div className="back-item">
                  <h4>Site Web</h4>
                  <p style={{ color: config.accent_color }}>{config.back_fields_website}</p>
                </div>
              )}
            </div>
          </div>

        </div>
        <p className="pro-hint" style={{textAlign:'center'}}>
          <RotateCw size={12} style={{marginRight:4}} />
          Ceci est un aperçu approximatif. Le rendu final peut varier selon le modèle d'iPhone.
        </p>
      </div>

    </div>
  );
};

export default CardCustomizer;
