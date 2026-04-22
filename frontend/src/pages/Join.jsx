import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { Loader2, AlertTriangle, AlertCircle, CheckCircle2, ArrowLeft, Check, Smartphone, X, Shield } from 'lucide-react'
import './Join.css'

function Join() {
  const { empresaId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [companyInfo, setCompanyInfo] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [selectedWallet, setSelectedWallet] = useState('apple')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [showRgpdModal, setShowRgpdModal] = useState(false)

  useEffect(() => {
    // Force dark mode by default for Premium Experience
    const savedTheme = localStorage.getItem('theme') || 'dark'
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }, [])

  // Charger les infos de l'entreprise
  useEffect(() => {
    if (!empresaId) {
      setError('ID entreprise manquant')
      return
    }

    loadCompanyInfo()
  }, [empresaId])

  const loadCompanyInfo = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/companies/${empresaId}/info`)
      console.log('Company info loaded:', response.data)
      setCompanyInfo(response.data)
    } catch (err) {
      console.error('Error loading company:', err)
      setError('Entreprise non trouvée. Vérifiez l\'ID.')
      setTimeout(() => navigate('/'), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('Le prénom est requis')
      return false
    }
    if (!formData.lastName.trim()) {
      setError('Le nom est requis')
      return false
    }
    if (!formData.email.trim()) {
      setError('L\'email est requis')
      return false
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Email invalide')
      return false
    }

    if (!formData.phone.trim()) {
      setError('Le numéro de téléphone est requis')
      return false
    }

    const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/
    if (!phoneRegex.test(formData.phone)) {
      setError('Numéro de téléphone invalide')
      return false
    }

    if (!termsAccepted) {
      setError('Vous devez accepter les Conditions d\'utilisation pour continuer.')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) return

    setFormSubmitting(true)

    try {
      // Étape 1: Enregistrer le client
      const registrationResponse = await api.post(`/join/${empresaId}`, {
        nom: formData.lastName,
        prenom: formData.firstName,
        email: formData.email,
        telephone: formData.phone,
        type_wallet: selectedWallet,
        marketing_optin: marketingOptIn
      })

      console.log('Registration answer raw:', registrationResponse.data);

      const clientId = registrationResponse.data.clientId || registrationResponse.data?.id;

      if (!clientId) {
        console.error('CRITICAL: clientId missed in response:', registrationResponse.data);
        setError('Erreur technique: Identifiant client non reçu par le serveur.');
        setFormSubmitting(false);
        return;
      }

      setSuccess(`Inscription réussie ! Préparation de votre carte...`);

      // Redirection automatique via GET vers la route téléchargement natif
      setTimeout(() => {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        // Nettoyage de l'URL pour éviter les double slash
        const baseApi = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        window.location.href = `${baseApi}/app/wallet/client-download/${clientId}`;
      }, 1000)
    } catch (err) {
      console.error('Registration error:', err)
      const errorMsg = err.response?.data?.error || 'Erreur lors de la création de la carte'
      setError(errorMsg)
    } finally {
      setFormSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="join-container">
        <div className="join-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <Loader2 className="animate-spin" size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !companyInfo) {
    return (
      <div className="join-container">
        <div className="join-error" style={{ textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 16px', color: '#EF4444' }} />
          <p style={{ marginBottom: '20px' }}>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="luxe-auth-container">
      <div className="luxe-auth-bg"></div>
      
      <div className="luxe-auth-card" style={{ maxWidth: '500px' }}>
        <div className="luxe-auth-header">
          {companyInfo?.logo && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ width: '70px', height: '70px', background: 'white', padding: '10px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                <img src={companyInfo.logo} alt={companyInfo.nom} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            </div>
          )}
          <h1>Rejoignez-nous</h1>
          {companyInfo && (
            <p>Votre carte de fidélité chez <strong>{companyInfo.nom}</strong></p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="luxe-auth-form">
          <div className="luxe-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div className="luxe-form-group">
                <label htmlFor="firstName">Prénom</label>
                <input
                  id="firstName"
                  className="luxe-input"
                  type="text"
                  name="firstName"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={formSubmitting}
                  required
                />
              </div>
              <div className="luxe-form-group">
                <label htmlFor="lastName">Nom</label>
                <input
                  id="lastName"
                  className="luxe-input"
                  type="text"
                  name="lastName"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={formSubmitting}
                  required
                />
              </div>
          </div>

          <div className="luxe-form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="luxe-input"
              type="email"
              name="email"
              placeholder="votre@email.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={formSubmitting}
              required
            />
          </div>

          <div className="luxe-form-group">
            <label htmlFor="phone">Téléphone</label>
            <input
              id="phone"
              className="luxe-input"
              type="tel"
              name="phone"
              placeholder="06 12 34 56 78"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={formSubmitting}
              required
            />
          </div>

          {/* ===== RGPD CONSENT ===== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg-subtle)', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                disabled={formSubmitting}
                style={{ marginTop: '3px', accentColor: 'var(--accent)', width: '16px', height: '16px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                J'accepte les{' '}
                <button
                  type="button"
                  onClick={() => setShowRgpdModal(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '12px', fontWeight: '600' }}
                >
                  CGU & Politique de confidentialité
                </button>
                {' '}<span style={{ color: '#ef4444', fontWeight: '600' }}>*</span>
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={e => setMarketingOptIn(e.target.checked)}
                disabled={formSubmitting}
                style={{ marginTop: '3px', accentColor: 'var(--accent)', width: '16px', height: '16px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                J'accepte de recevoir des offres promotionnelles (SMS/Email) de la part du commerçant.
              </span>
            </label>
          </div>

          <div className="luxe-form-group">
            <label style={{ fontSize: '11px', opacity: 0.6 }}>INSTALLER SUR :</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              <div
                className={`luxe-wallet-opt ${selectedWallet === 'apple' ? 'active' : ''}`}
                onClick={() => setSelectedWallet('apple')}
                style={{
                  padding: '12px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-light)',
                  background: selectedWallet === 'apple' ? 'var(--accent-light)' : 'var(--bg-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: 'pointer', transition: 'all 0.3s ease',
                  borderColor: selectedWallet === 'apple' ? 'var(--accent)' : 'var(--border-light)'
                }}
              >
                <Smartphone size={18} color={selectedWallet === 'apple' ? 'var(--accent)' : 'var(--text-tertiary)'} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: selectedWallet === 'apple' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>iPhone</span>
              </div>
              <div
                className={`luxe-wallet-opt ${selectedWallet === 'google' ? 'active' : ''}`}
                onClick={() => setSelectedWallet('google')}
                style={{
                  padding: '12px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-light)',
                  background: selectedWallet === 'google' ? 'var(--accent-light)' : 'var(--bg-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: 'pointer', transition: 'all 0.3s ease',
                  borderColor: selectedWallet === 'google' ? 'var(--accent)' : 'var(--border-light)'
                }}
              >
                <Smartphone size={18} color={selectedWallet === 'google' ? 'var(--accent)' : 'var(--text-tertiary)'} style={{ transform: 'rotate(180deg)' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: selectedWallet === 'google' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>Android</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="luxe-alert error">
              <AlertCircle size={18} /> <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-luxe-submit-wallet"
            disabled={formSubmitting}
            style={{ 
              width: '100%', 
              background: 'transparent', 
              padding: 0, 
              border: 'none',
              boxShadow: 'none',
              marginTop: '12px'
            }}
          >
            {formSubmitting ? (
              <div className="btn-luxe-submit" style={{ width: '100%' }}>
                <Loader2 className="spin" size={20} />
              </div>
            ) : (
              <img 
                src={selectedWallet === 'apple' ? '/apple-wallet-button.png' : '/google-wallet-button.svg'} 
                alt={selectedWallet === 'apple' ? 'Add to Apple Wallet' : 'Save to Google Pay'}
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  maxHeight: '54px', 
                  objectFit: 'contain',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                className="wallet-submit-img"
              />
            )}
          </button>
        </form>

        <div className="luxe-auth-footer">
          <p>© 2026 Fidelyz • Plateforme de Fidélité Pro</p>
        </div>
      </div>

      {/* ===== MODALE RGPD ===== */}
      {showRgpdModal && (
        <div
          onClick={() => setShowRgpdModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card, #1e2530)', borderRadius: '20px', maxWidth: '560px',
              width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={20} style={{ color: 'var(--accent)' }} />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Politique de confidentialité & CGU</h2>
              </div>
              <button onClick={() => setShowRgpdModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '24px', fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
              <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>1. Collecte des données personnelles</h3>
              <p>Dans le cadre de l'inscription à ce programme de fidélité, nous collectons les informations suivantes : prénom, nom, adresse e-mail et numéro de téléphone. Ces données sont nécessaires à la création et à la gestion de votre carte de fidélité.</p>

              <h3 style={{ color: 'var(--text-primary)' }}>2. Finalité du traitement</h3>
              <p>Vos données personnelles sont utilisées exclusivement pour :</p>
              <ul>
                <li>Créer et gérer votre carte de fidélité numérique (Apple Wallet / Google Wallet)</li>
                <li>Calculer et afficher votre solde de points de fidélité</li>
                <li>Vous permettre d'utiliser vos avantages chez le commerçant</li>
              </ul>

              <h3 style={{ color: 'var(--text-primary)' }}>3. Consentement marketing (optionnel)</h3>
              <p>Si vous cochez la case correspondante, votre e-mail et téléphone pourront être utilisés par le commerçant pour vous envoyer des offres promotionnelles. Ce consentement est strictement facultatif et n'affecte pas votre accès au programme de fidélité. Vous pouvez le retirer à tout moment en contactant le commerçant.</p>

              <h3 style={{ color: 'var(--text-primary)' }}>4. Conservation des données</h3>
              <p>Vos données sont conservées pendant toute la durée de votre participation au programme de fidélité, puis supprimées dans un délai de 3 ans après votre dernière interaction.</p>

              <h3 style={{ color: 'var(--text-primary)' }}>5. Vos droits (RGPD)</h3>
              <p>Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679), vous disposez des droits suivants : accès, rectification, effacement, opposition, portabilité et limitation du traitement. Pour exercer ces droits, contactez directement le commerçant dont vous rejoignez le programme.</p>

              <h3 style={{ color: 'var(--text-primary)' }}>6. Responsable du traitement</h3>
              <p>Le responsable du traitement est le commerçant dont vous rejoignez le programme de fidélité. La plateforme Fidelyz agit en qualité de sous-traitant au sens du RGPD.</p>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => { setTermsAccepted(true); setShowRgpdModal(false); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                  background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: '700',
                  cursor: 'pointer', fontSize: '14px'
                }}
              >
                J'accepte
              </button>
              <button
                type="button"
                onClick={() => setShowRgpdModal(false)}
                style={{
                  padding: '12px 20px', borderRadius: '12px',
                  border: '1px solid var(--border-light)', background: 'transparent',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>


  )
}

export default Join
