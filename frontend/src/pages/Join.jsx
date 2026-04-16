import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { Loader2, AlertTriangle, AlertCircle, CheckCircle2, ArrowLeft, Check, Smartphone } from 'lucide-react'
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
        type_wallet: selectedWallet
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
            className="btn-luxe-submit"
            disabled={formSubmitting}
            style={{ width: '100%' }}
          >
            {formSubmitting ? (
              <Loader2 className="spin" size={20} />
            ) : (
              <>Créer ma carte <Check size={20} /></>
            )}
          </button>
        </form>

        <div className="luxe-auth-footer">
          <p>© 2026 Fidelyz • Plateforme de Fidélité Pro</p>
        </div>
      </div>
    </div>


  )
}

export default Join
