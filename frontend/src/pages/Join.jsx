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
    <div className="join-container">
      <div className="join-card">
        {/* Header with Logo */}
        <div className="join-header">
          {companyInfo?.logo && (
            <div className="join-logo-wrapper">
              <div className="join-logo-container">
                <img src={companyInfo.logo} alt={companyInfo.nom} />
              </div>
            </div>
          )}
          <h1>Rejoignez-nous</h1>
          {companyInfo && (
            <p className="join-company">Carte de fidélité pour <strong>{companyInfo.nom}</strong></p>
          )}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="join-form">
          {error && (
            <div className="alert error" style={{ borderRadius: '12px', fontSize: '13px' }}>
              <AlertCircle size={16} /> <span>{error}</span>
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Prénom</label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                placeholder="Votre prénom"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={formSubmitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Nom</label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                placeholder="Votre nom"
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={formSubmitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="votre@email.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={formSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Téléphone</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder="06 12 34 56 78"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={formSubmitting}
              required
            />
          </div>

          <div className="wallet-selector-group">
            <label className="wallet-selector-label" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
              INSTALLER SUR :
            </label>
            <div className="wallet-options">
              <div
                className={`wallet-option ${selectedWallet === 'apple' ? 'active' : ''}`}
                onClick={() => setSelectedWallet('apple')}
              >
                <Smartphone size={24} color={selectedWallet === 'apple' ? '#3b82f6' : 'rgba(255,255,255,0.3)'} />
                <span>iPhone</span>
              </div>
              <div
                className={`wallet-option ${selectedWallet === 'google' ? 'active' : ''}`}
                onClick={() => setSelectedWallet('google')}
              >
                <Smartphone size={24} color={selectedWallet === 'google' ? '#3b82f6' : 'rgba(255,255,255,0.3)'} style={{ transform: 'rotate(180deg)' }} />
                <span>Android</span>
              </div>
            </div>
          </div>

          <button type="submit" className="join-btn-submit" disabled={formSubmitting}>
            {formSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>C'est parti ! <Check size={20} /></>
            )}
          </button>
        </form>

        <div className="join-info-footer">
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
             Plateforme de fidélité sécurisée par <strong>Fidelyz</strong>
          </p>
        </div>
      </div>
    </div>

  )
}

export default Join
