import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
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
          <h1>Accès Admin</h1>
          <p className="subtitle">Gestion des entreprises</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form login-form">
          <div className="form-group">
            <label htmlFor="identifiant">Identifiant</label>
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
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
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
              className="btn-ghost"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
              style={{ position: 'absolute', right: '10px', top: '34px', padding: '4px' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="alert error">
              <AlertCircle size={18} /> <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
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