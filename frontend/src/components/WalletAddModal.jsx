import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Smartphone, X as XIcon, CheckCircle2, AlertCircle, Info, Loader2, Plus } from 'lucide-react';
import '../styles/WalletAddModal.css';

const WalletAddModal = ({ isOpen, onClose, clientId, clientName, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAddToWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Appeler l'API pour créer le pass Apple Wallet
      const response = await fetch('/api/app/wallet/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('clientToken')}`
        },
        body: JSON.stringify({
          clientId,
          clientName
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      // Récupérer le .pkpass et le télécharger
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clientName}-loyalty.pkpass`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(true);
      if (onSuccess) onSuccess();

      // Fermer le modal après 2 secondes
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
              <p>Votre carte a été ajoutée au Wallet avec succès.</p>
              <p className="wallet-info-text">Le fichier de passe s'est téléchargé automatiquement.</p>
            </div>
          ) : error ? (
            <div className="wallet-error-message">
              <div className="wallet-error-icon"><AlertCircle size={48} /></div>
              <h3>Erreur</h3>
              <p>{error}</p>
              <button 
                className="wallet-retry-btn"
                onClick={() => {
                  setError(null);
                  handleAddToWallet();
                }}
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="wallet-form">
              <p className="wallet-description">
                Cliquez sur le bouton ci-dessous pour ajouter votre carte de fidélité au Wallet Apple.
              </p>

              <div className="wallet-info-box">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={16} /> Qu'est-ce qui se passe?</h4>
                <ul>
                  <li>Votre carte Apple Wallet sera créée</li>
                  <li>Vous recevrez les mises à jour de points en temps réel</li>
                  <li>Accés rapide depuis le Wallet de votre iPhone</li>
                </ul>
              </div>

              <button
                className="wallet-add-btn"
                onClick={handleAddToWallet}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    En cours...
                  </>
                ) : (
                  <><Plus size={18} /> Ajouter au Wallet</>
                )}
              </button>
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
