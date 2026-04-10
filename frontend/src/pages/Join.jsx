import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { Loader2, AlertTriangle, AlertCircle, CheckCircle2, ArrowLeft, Check } from 'lucide-react'
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
        type_wallet: 'apple' // On enregistre pour Apple Wallet par défaut
      })

      console.log('Registration response:', registrationResponse.data)

      const clientId = registrationResponse.data.clientId

      if (!clientId) {
        setError('Erreur: ID client non reçu')
        setFormSubmitting(false)
        return
      }

      setSuccess('Inscription réussie ! Redirection vers Apple Wallet...')

      // Redirection automatique via GET vers la route téléchargement natif
      setTimeout(() => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        window.location.href = `${apiUrl}/app/wallet/client-download/${clientId}`;
      }, 1500)
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
        {/* Header */}
        <div className="join-header">
          <button className="join-back" onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={18} /> Retour
          </button>
          <h1>Créer votre carte de fidélité</h1>
          {companyInfo && (
            <p className="join-company">pour <strong>{companyInfo.nom}</strong></p>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert error">
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert success">
            <CheckCircle2 size={18} /> <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="join-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Prénom *</label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                placeholder="Jean"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={formSubmitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Nom *</label>
              <input
                id="lastName"
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

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="jean.dupont@example.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={formSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Numéro de téléphone *</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder="+33 6 12 34 56 78"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={formSubmitting}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={formSubmitting}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            {formSubmitting ? (
              <><Loader2 className="animate-spin" size={18} style={{ animation: 'spin 1s linear infinite' }} /> Création en cours...</>
            ) : (
              <><Check size={18} /> Créer ma carte</>
            )}
          </button>
        </form>

        {/* Info Footer */}
        <div className="join-footer">
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '0' }}>
            Vos données sont sécurisées et ne seront utilisées que pour votre carte de fidélité.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Join
