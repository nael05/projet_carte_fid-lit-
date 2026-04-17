import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import './Auth.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  // Initialisation du thème
  useEffect(() => {
    const savedTheme = localStorage.getItem('fidelyz-theme') || 'dark'
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/pro/forgot-password', { email })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="luxe-auth-container">
        <div className="luxe-auth-bg"></div>
        <div className="luxe-auth-card">
          <div className="luxe-auth-header">
            <div className="luxe-icon-success" style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
              <CheckCircle2 size={48} color="#10B981" />
            </div>
            <h1>Vérifiez vos emails</h1>
            <p>Si un compte existe pour <strong>{email}</strong>, vous allez recevoir un lien de réinitialisation.</p>
          </div>
          <Link to="/pro/login" className="btn-luxe-submit" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="luxe-auth-container">
      <div className="luxe-auth-bg"></div>
      
      <div className="luxe-auth-card">
        <div className="luxe-auth-header">
          <Link to="/pro/login" className="back-link">
            <ArrowLeft size={16} /> Retour
          </Link>
          <h1>Récupération</h1>
          <p>Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>

        <form onSubmit={handleSubmit} className="luxe-auth-form">
          <div className="luxe-form-group">
            <label htmlFor="email">Email professionnel</label>
            <input
              id="email"
              className="luxe-input"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="luxe-alert error">
              <AlertCircle size={18} /> <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-luxe-submit"
            disabled={loading || !email}
          >
            {loading ? (
              <Loader2 className="spin" size={20} />
            ) : (
              <>Envoyer le lien</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ForgotPassword
