import React, { useState, useEffect } from 'react';
import api from '../api';
import { Palette, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const CardCustomizer = ({ proInfo }) => {
  const [config, setConfig] = useState({
    primary_color: '#1f2937',
    text_color: '#ffffff',
    accent_color: '#3b82f6',
    secondary_color: '#374151',
    logo_url: '',
    card_title: '',
    card_subtitle: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (proInfo?.id) {
      loadCustomization();
    }
  }, [proInfo]);

  const loadCustomization = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/pro/card-customization/${proInfo.id}?loyaltyType=${proInfo.loyalty_type || 'points'}`);
      // Merge retrieved data with defaults in case of empty
      setConfig(prev => ({
        ...prev,
        ...data,
        logo_url: data.logo_url || '',
        card_title: data.card_title || '',
        card_subtitle: data.card_subtitle || ''
      }));
    } catch (err) {
      console.error('Erreur lors du chargement de la personnalisation', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    setUploading(true);
    setMessage('');
    
    try {
      const response = await api.post('/pro/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setConfig(prev => ({ ...prev, logo_url: response.data.url }));
        setMessage('Logo uploadé avec succès ! N\'oubliez pas de sauvegarder.');
      }
    } catch (err) {
      console.error('Erreur upload', err);
      setMessage("Erreur lors de l'upload du logo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put(`/pro/card-customization/${proInfo.id}?loyaltyType=${proInfo.loyalty_type || 'points'}`, config);
      setMessage('success:Personnalisation enregistrée avec succès !');
    } catch (err) {
      console.error('Erreur sauvegarde', err);
      setMessage('error:Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="card dashboard-content" style={{ marginTop: '20px' }}>
      <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Palette size={24} /> Personnalisation de votre Carte
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Ces paramètres définiront l'apparence des cartes Apple Wallet téléchargées par vos clients.
      </p>

      {message && (
        <div className={`alert ${message.startsWith('error:') ? 'error' : 'success'}`} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             {message.startsWith('error:') ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
             <span>{message.replace('error:', '').replace('success:', '')}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        
        {/* Formulaire */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          
          {/* Logo Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>Logo de l'entreprise</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload} 
              disabled={uploading}
              style={{ display: 'block', marginBottom: '10px' }}
            />
            {uploading && <small style={{ color: '#0284c7' }}>Upload en cours...</small>}
            {config.logo_url && (
              <div style={{ marginTop: '10px' }}>
                <img src={config.logo_url} alt="Logo" style={{ maxHeight: '60px', borderRadius: '5px', border: '1px solid #ddd', padding: '2px', background: config.primary_color }} />
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Titre (Optionnel)</label>
            <input 
              type="text" 
              name="card_title" 
              value={config.card_title} 
              onChange={handleChange}
              placeholder="Ex: Carte VIP"
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Sous-titre de la carte</label>
            <input 
              type="text" 
              name="card_subtitle" 
              value={config.card_subtitle} 
              onChange={handleChange}
              placeholder="Ex: Merci pour votre fidélité !"
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Couleur de Fond</label>
              <input type="color" name="primary_color" value={config.primary_color} onChange={handleChange} style={{ width: '60px', height: '40px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Texte Principal</label>
              <input type="color" name="text_color" value={config.text_color} onChange={handleChange} style={{ width: '60px', height: '40px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Label (Accents)</label>
              <input type="color" name="accent_color" value={config.accent_color} onChange={handleChange} style={{ width: '60px', height: '40px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Couleur Secondaire</label>
              <input type="color" name="secondary_color" value={config.secondary_color} onChange={handleChange} style={{ width: '60px', height: '40px' }} />
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={saving}
            className="btn-primary" 
            style={{ width: '100%', padding: '15px', marginTop: '20px' }}
          >
            {saving ? <><Loader2 className="animate-spin" size={18} /> Sauvegarde...</> : 'Enregistrer le modèle'}
          </button>
        </div>

        {/* Aperçu */}
        <div style={{ width: '320px', margin: '0 auto' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '15px', color: '#666' }}>Aperçu Rapide</h3>
          <div style={{ 
            background: config.primary_color, 
            color: config.text_color, 
            borderRadius: '16px', 
            height: '420px', 
            padding: '20px',
            position: 'relative',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               {config.logo_url ? <img src={config.logo_url} alt="Logo" style={{ maxHeight: '40px' }} /> : <div style={{width:'40px',height:'40px',background:'rgba(255,255,255,0.2)',borderRadius:'50%'}}></div>}
               <span style={{ fontWeight: 'bold' }}>{proInfo?.nom || 'Entreprise'}</span>
            </div>
            <div style={{ marginTop: '50px' }}>
              <div style={{ color: config.accent_color, fontSize: '12px', textTransform: 'uppercase', marginBottom: '5px' }}>Points</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>0</div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontWeight: '500' }}>{config.card_title || 'Carte de Fidélité'}</div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>{config.card_subtitle}</div>
            </div>
            
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', height: '100px', background: 'rgba(255,255,255,0.9)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '80%', height: '80%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px' }}>
                QR CODE
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CardCustomizer;
