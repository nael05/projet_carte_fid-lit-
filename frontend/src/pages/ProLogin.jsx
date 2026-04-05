import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import './ProLogin.css'

function ProLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const navigate = useNavigate()
  const { login, isAuthenticated, loading: authLoading, role } = useAuth()
  const redirectedRef = useRef(false)

  // Redirect if already logged in AND is Pro (only once)
  useEffect(() => {
    // Ne rediriger QUE si:
    // 1. AuthContext a fini de charger
    // 2. L'utilisateur est vraiment authentifié
    // 3. Son rôle est 'pro' (pas 'admin')
    // 4. On n'a pas déjà redirigé
    if (authLoading) return
    
    if (isAuthenticated && role === 'pro' && !redirectedRef.current) {
      redirectedRef.current = true
      navigate('/pro/dashboard')
    }
  }, [authLoading, isAuthenticated, role, navigate])

  // Load remembered email & clean bad auth data (une seule fois au mount)
  useEffect(() => {
    // Nettoyer les données d'authentification invalides au chargement de cette page
    // Si on a des données stockées, elles font bugger la redirection
    const currentRole = localStorage.getItem('userRole')
    if (currentRole && currentRole !== 'pro') {
      // On est sur la page Pro/Login mais avec un rôle admin/autre
      // Nettoyer pour éviter les redirections infinies
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
      localStorage.removeItem('deviceId')
    }

    const remembered = localStorage.getItem('rememberedEmail')
    if (remembered) {
      setEmail(remembered)
      setRememberMe(true)
    }
  }, []) // ✅ Array vide = une seule fois au montage

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/pro/login', {
        email,
        mot_de_passe: password
      })

      if (response.data.token) {
        // Save token and login
        login(response.data.token, 'pro')
        
        // Store company info
        if (response.data.companyId) {
          localStorage.setItem('companyId', response.data.companyId)
          localStorage.setItem('companyName', response.data.nom)
        }

        // 🔐 Store device ID for session management
        if (response.data.deviceId) {
          localStorage.setItem('deviceId', response.data.deviceId)
        }
        
        // Store for remember me
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email)
        } else {
          localStorage.removeItem('rememberedEmail')
        }

        // Check if password must be changed
        if (response.data.mustChangePassword) {
          navigate('/pro/reset-password', { 
            state: { email, firstTime: true } 
          })
        } else {
          navigate('/pro/dashboard')
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      
      if (err.response?.status === 401) {
        setError('❌ Email ou mot de passe incorrect')
      } else if (err.response?.status === 403) {
        setError('🔒 Votre compte a été suspendu')
      } else {
        setError(err.response?.data?.error || '❌ Erreur de connexion')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pro-login-container">
      {/* Left side - Blur blob decoration */}
      <div className="pro-login-decoration">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Right side - Login form */}
      <div className="pro-login-form-wrapper">
        <div className="pro-login-form-content">
          {/* Header */}
          <div className="pro-login-header">
            <div className="pro-login-logo">
              <span className="logo-emoji">📊</span>
              <span className="logo-text">LoyaltyCore Pro</span>
            </div>
            <h1>Connexion Entreprise</h1>
            <p className="pro-login-subtitle">
              Accédez à votre espace de gestion de fidélité
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="pro-login-form">
            {/* Error Alert */}
            {error && (
              <div className="pro-alert pro-alert-error">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div className="pro-form-group">
              <label htmlFor="email">Email</label>
              <div className="pro-input-wrapper">
                <input
                  id="email"
                  type="email"
                  placeholder="contact@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                />
                <span className="pro-input-icon">✉️</span>
              </div>
            </div>

            {/* Password Input */}
            <div className="pro-form-group">
              <div className="pro-password-header">
                <label htmlFor="password">Mot de passe</label>
                <button
                  type="button"
                  className="pro-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '👁️ Masquer' : '👁️‍🗨️ Afficher'}
                </button>
              </div>
              <div className="pro-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <span className="pro-input-icon">🔐</span>
              </div>
            </div>

            {/* Remember me */}
            <div className="pro-checkbox-group">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="rememberMe">Se souvenir de cet email</label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="pro-btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loader"></span>
                  Connexion en cours...
                </>
              ) : (
                '🚀 Se connecter'
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="pro-info-box">
            <p className="pro-info-title">💡 Premier accès?</p>
            <p className="pro-info-text">
              Utilisez les identifiants temporaires reçus de votre administrateur. 
              Vous devrez changer le mot de passe à la première connexion.
            </p>
          </div>

          {/* Footer Links */}
          <div className="pro-login-footer">
            <p>
              Espace admin?{' '}
              <button
                type="button"
                onClick={() => navigate('/master-admin-secret')}
                className="pro-link-button"
              >
                Se connecter ici
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProLogin
