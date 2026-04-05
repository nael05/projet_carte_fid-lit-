import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import './Auth.css'
import './AdminLogin.css'

function AdminLogin() {
  const [identifiant, setIdentifiant] = useState('')
  const [mot_de_passe, setMotDePasse] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { login, isAuthenticated, isAdmin } = useAuth()

  useEffect(() => {
    if (isAuthenticated && isAdmin()) {
      navigate('/master-admin-secret/dashboard')
    }
  }, [isAuthenticated, isAdmin, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/admin/login', { identifiant, mot_de_passe })
      login(response.data.token, 'admin')
      navigate('/master-admin-secret/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container login-page">
      <div className="login-background">
        <div className="gradient-blob blob-1"></div>
        <div className="gradient-blob blob-2"></div>
      </div>
      
      <div className="auth-card login-card">
        <div className="login-header">
          <div className="logo-icon">🔐</div>
          <h1>Acces Admin</h1>
          <p className="subtitle">Gestion des entreprises</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form login-form">
          <div className="form-group">
            <label htmlFor="identifiant">Identifiant</label>
            <div className="input-wrapper">
              <input
                id="identifiant"
                type="text"
                placeholder="Entrez votre identifiant"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                disabled={loading}
                required
                autoComplete="username"
              />
              <span className="input-icon">👤</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Entrez votre mot de passe"
                value={mot_de_passe}
                onChange={(e) => setMotDePasse(e.target.value)}
                disabled={loading}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? '🔓' : '🔒'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Connexion en cours...
              </>
            ) : (
              <>Se connecter</>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Identifiants: master_admin / AdminPassword123!</p>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin