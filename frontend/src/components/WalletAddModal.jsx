import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Smartphone, X as XIcon, CheckCircle2, AlertCircle, Info, Loader2, Plus } from 'lucide-react';
import '../styles/WalletAddModal.css';
import { requestFCMToken } from '../utils/fcmHelper';

const WalletAddModal = ({ isOpen, onClose, clientId, clientName, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAddToWallet = async (platform) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const token = localStorage.getItem('clientToken');
      const response = await fetch('/api/app/wallet/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ clientId, clientName, type_wallet: platform })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }

      if (platform === 'apple') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${clientName}-loyalty.pkpass`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        if (data.saveUrl) {
          window.open(data.saveUrl, '_blank');
        }

        // Enregistrement FCM en arrière-plan (sans bloquer ni afficher d'erreur si refusé)
        requestFCMToken().then(fcmToken => {
          if (fcmToken) {
            fetch('/api/app/wallet/register-fcm-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ clientId, fcmToken })
            }).catch(() => {});
          }
        }).catch(() => {});
      }

      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.message);
      console.error('Wallet error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wallet-modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Smartphone size={22} /> Ajouter au Wallet</h2>
          <button 
            className="wallet-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="wallet-modal-body">
          {success ? (
            <div className="wallet-success-message">
              <div className="wallet-success-icon"><CheckCircle2 size={48} /></div>
              <h3>Succès!</h3>
              <p>Votre carte a été préparée avec succès.</p>
              <p className="wallet-info-text">Suivez les instructions sur votre écran pour l'ajouter.</p>
            </div>
          ) : error ? (
            <div className="wallet-error-message">
              <div className="wallet-error-icon"><AlertCircle size={48} /></div>
              <h3>Erreur</h3>
              <p>{error}</p>
              <button 
                className="wallet-retry-btn"
                onClick={() => setError(null)}
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="wallet-form">
              <p className="wallet-description">
                Choisissez votre plateforme pour ajouter votre carte de fidélité numérique.
              </p>

              <div className="wallet-options-grid">
                <div 
                  className="wallet-option-card apple"
                  onClick={() => handleAddToWallet('apple')}
                >
                  <div className="wallet-icon-wrapper">
                    <Smartphone size={24} />
                  </div>
                  <span>Apple Wallet</span>
                  <p className="wallet-description-small">Pour iPhone / iOS</p>
                </div>

                <div 
                  className="wallet-option-card google"
                  onClick={() => handleAddToWallet('google')}
                >
                  <div className="wallet-icon-wrapper">
                    <Smartphone size={24} style={{ transform: 'rotate(180deg)' }} />
                  </div>
                  <span>Google Wallet</span>
                  <p className="wallet-description-small">Pour Android</p>
                </div>
              </div>

              <div className="wallet-info-box">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={16} /> Pourquoi l'ajouter ?</h4>
                <ul>
                  <li>Accès rapide sans connexion internet</li>
                  <li>Notifications de points en temps réel</li>
                  <li>Notifications à proximité du magasin</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

WalletAddModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  clientId: PropTypes.number.isRequired,
  clientName: PropTypes.string.isRequired,
  onSuccess: PropTypes.func
};

export default WalletAddModal;
