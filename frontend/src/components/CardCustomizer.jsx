import React, { useState, useEffect } from 'react';
import '../styles/CardCustomizer.css';

const CardCustomizer = ({ companyId, loyaltyType }) => {
  const [customization, setCustomization] = useState({
    wallet_class_id: '',
    wallet_card_title: '',
    wallet_header_text: '',
    wallet_subtitle_text: '',
    wallet_barcode_text_template: 'ID: {clientId}',
    wallet_description_text: '',
    wallet_card_background_color: '#1f2937',
    wallet_text_color: '#ffffff',
    wallet_accent_color: '#3b82f6',
    apple_card_color: '#000000',
    apple_logo_url: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('design');
  const [previewClientId] = useState('550e8400-e29b-41d4-a716-4466554400000');

  useEffect(() => {
    loadCustomization();
  }, [companyId, loyaltyType]);

  const loadCustomization = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/pro/card-customization/${companyId}?loyaltyType=${loyaltyType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erreur chargement');

      const data = await response.json();
      setCustomization(prev => ({
        ...prev,
        ...data
      }));
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('❌ Erreur chargement personnalisation');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCustomization(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleColorChange = (field, value) => {
    setCustomization(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('❌ Veuillez sélectionner une image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ L\'image ne doit pas dépasser 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomization(prev => ({
        ...prev,
        [field]: event.target.result
      }));
      setMessage(`✅ Image ${field} chargée`);
    };
    reader.readAsDataURL(file);
  };

  const saveCustomization = async () => {
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/pro/card-customization/${companyId}?loyaltyType=${loyaltyType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(customization)
      });

      if (!response.ok) throw new Error('Erreur sauvegarde');

      setMessage('✅ Configuration Google Wallet sauvegardée! Elle s\'applique à TOUTES les cartes créées.');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('❌ Erreur sauvegarde personnalisation');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (confirm('Réinitialiser aux paramètres par défaut?')) {
      setCustomization({
        wallet_class_id: '',
        wallet_card_title: '',
        wallet_header_text: '',
        wallet_subtitle_text: '',
        wallet_barcode_text_template: 'ID: {clientId}',
        wallet_description_text: '',
        wallet_card_background_color: '#1f2937',
        wallet_text_color: '#ffffff',
        wallet_accent_color: '#3b82f6',
        apple_card_color: '#000000',
        apple_logo_url: ''
      });
      setMessage('✅ Réinitialisé aux paramètres par défaut');
    }
  };

  if (loading) {
    return (
      <div className="card-customizer">
        <p style={{ textAlign: 'center', color: '#999' }}>⏳ Chargement...</p>
      </div>
    );
  }

  const previewBarcodeText = customization.wallet_barcode_text_template?.replace('{clientId}', previewClientId.substring(0, 12)) || 'ID: ' + previewClientId.substring(0, 12);

  return (
    <div className="card-customizer">
      <div className="customizer-header">
        <h2>🎨 Personnalisation Google Wallet ({loyaltyType})</h2>
        <p>Configurez l'apparence de vos passes pour Google Wallet</p>
      </div>

      {message && (
        <div className={`status-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="customizer-layout">
        <div className="control-panel">
          <div className="tabs-nav">
            <button
              className={`tab-btn ${activeTab === 'design' ? 'active' : ''}`}
              onClick={() => setActiveTab('design')}
            >
              🎨 Design
            </button>
            <button
              className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              📸 Média
            </button>
          </div>

          {activeTab === 'design' && (
            <div className="tab-content">
              <div className="wallet-section">
                <h3>📱 Google Wallet</h3>
                <div className="control-group">
                  <label>Class ID</label>
                  <input type="text" placeholder="Ex: FideliteBoulangerie" value={customization.wallet_class_id} onChange={(e) => handleInputChange('wallet_class_id', e.target.value)} className="text-input" />
                  <small>Identifiant unique du modèle</small>
                </div>

                <div className="control-group">
                  <label>Titre de la Carte</label>
                  <input type="text" placeholder="Ex: Pâtisserie Laurent" value={customization.wallet_card_title} onChange={(e) => handleInputChange('wallet_card_title', e.target.value)} className="text-input" />
                </div>

                <div className="control-group">
                  <label>Texte Principal</label>
                  <input type="text" placeholder="Ex: Accumulez vos points" value={customization.wallet_header_text} onChange={(e) => handleInputChange('wallet_header_text', e.target.value)} className="text-input" />
                </div>

                <div className="control-group">
                  <label>Sous-titre</label>
                  <input type="text" placeholder="Ex: Profitez de récompenses" value={customization.wallet_subtitle_text} onChange={(e) => handleInputChange('wallet_subtitle_text', e.target.value)} className="text-input" />
                </div>

                <div className="control-group">
                  <label>Template Code-barres</label>
                  <input type="text" placeholder="ID: {clientId}" value={customization.wallet_barcode_text_template} onChange={(e) => handleInputChange('wallet_barcode_text_template', e.target.value)} className="text-input" />
                  <small>Utilise {'{clientId}'} pour l'ID du client</small>
                </div>

                <div className="control-group">
                  <label>Description</label>
                  <textarea value={customization.wallet_description_text} onChange={(e) => handleInputChange('wallet_description_text', e.target.value)} className="text-input" rows="2" placeholder="Description du pass" />
                </div>

                <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: 'var(--radius-md)', marginTop: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>🎨 Couleurs</h4>
                  <div className="color-group">
                    <label>Arrière-plan</label>
                    <div className="color-input-group">
                      <input type="color" value={customization.wallet_card_background_color} onChange={(e) => handleColorChange('wallet_card_background_color', e.target.value)} className="color-picker" />
                      <span className="color-value">{customization.wallet_card_background_color}</span>
                    </div>
                  </div>
                  <div className="color-group">
                    <label>Texte</label>
                    <div className="color-input-group">
                      <input type="color" value={customization.wallet_text_color} onChange={(e) => handleColorChange('wallet_text_color', e.target.value)} className="color-picker" />
                      <span className="color-value">{customization.wallet_text_color}</span>
                    </div>
                  </div>
                  <div className="color-group">
                    <label>Accent</label>
                    <div className="color-input-group">
                      <input type="color" value={customization.wallet_accent_color} onChange={(e) => handleColorChange('wallet_accent_color', e.target.value)} className="color-picker" />
                      <span className="color-value">{customization.wallet_accent_color}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="wallet-section apple-wallet">
                <h3>🍎 Apple Wallet</h3>
                <div className="apple-wallet-placeholder">
                  <p>⏳ À configurer ultérieurement</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="tab-content">
              <div style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <p style={{ color: '#666', marginTop: 0 }}>📸 Gestion des médias</p>
                <small style={{ color: '#999' }}>À implémenter</small>
              </div>
            </div>
          )}

          <div className="action-buttons">
            <button className="btn-primary" onClick={saveCustomization} disabled={saving}>
              {saving ? '💾 Sauvegarde...' : '💾 Sauvegarder'}
            </button>
            <button className="btn-secondary" onClick={resetToDefault} disabled={saving}>
              🔄 Réinitialiser
            </button>
          </div>
        </div>

        <div className="preview-section">
          <div className="preview-header">
            <h3>📱 Aperçu Google Wallet</h3>
            <small>Modification en temps réel</small>
          </div>

          <div
            className="card-preview"
            style={{
              backgroundColor: customization.wallet_card_background_color || '#1f2937',
              color: customization.wallet_text_color || '#ffffff'
            }}
          >
            <div className="preview-top">
              <div className="preview-card-title">{customization.wallet_card_title || 'LOYALTY CARD'}</div>
              <div className="preview-header-text">{customization.wallet_header_text || 'Bienvenue'}</div>
            </div>

            <div className="preview-content">
              <div className="preview-qr">
                {[...Array(100)].map((_, i) => (
                  <div key={i} className="preview-qr-square" style={{ opacity: Math.random() * 0.7 + 0.3 }} />
                ))}
              </div>
              <div className="preview-barcode">{previewBarcodeText}</div>
            </div>

            <div className="preview-bottom">
              <div className="preview-subtitle">{customization.wallet_subtitle_text || 'Profitez de vos récompenses'}</div>
            </div>
          </div>

          <div className="preview-info">
            💡 Cet aperçu montre comment votre pass apparaît dans Google Wallet
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardCustomizer;
