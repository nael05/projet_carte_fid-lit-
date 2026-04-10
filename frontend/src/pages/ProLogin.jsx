import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
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
      console.log('📤 Tentative de connexion...')
      const response = await api.post('/pro/login', {
        email,
        mot_de_passe: password
      })

      console.log('✅ Connexion réussie:', response.data)

      if (response.data.token) {
        // Sauvegarder le token et se connecter
        // ⚠️ IMPORTANT: Passer mustChangePassword au contexte
        login(response.data.token, 'pro', response.data.mustChangePassword)
        
        // Sauvegarder les informations de l'entreprise
        if (response.data.companyId) {
          localStorage.setItem('companyId', response.data.companyId)
          localStorage.setItem('companyName', response.data.nom)
          console.log('💾 Infos entreprise sauvegardées:', response.data.nom)
        }

        // 🔐 Sauvegarder l'ID d'appareil pour la gestion des sessions
        if (response.data.deviceId) {
          localStorage.setItem('deviceId', response.data.deviceId)
          console.log('💾 Device ID sauvegardé')
        }
        
        // Remember me
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email)
          console.log('💾 Email mémorisé')
        } else {
          localStorage.removeItem('rememberedEmail')
        }

        // 🔐 Vérifier si le changement de mot de passe est obligatoire
        // mustChangePassword doit TOUJOURS être un boolean
        const mustChange = response.data.mustChangePassword === true
        
        if (mustChange) {
          console.log('⚠️ Première connexion - Changement de mot de passe obligatoire')
          navigate('/pro/reset-password', { 
            state: { 
              email, 
              firstTime: true,
              fromLogin: true
            } 
          })
        } else {
          console.log('✅ Redirection vers le dashboard')
          navigate('/pro/dashboard')
        }
      }
    } catch (err) {
      console.error('❌ Erreur de connexion:', err)
      
      if (err.response?.status === 401) {
        setError('Email ou mot de passe incorrect')
      } else if (err.response?.status === 403) {
        setError('Votre compte a été suspendu')
      } else if (err.response?.status === 500) {
        setError('Erreur serveur - Veuillez réessayer')
      } else {
        setError(err.response?.data?.error || 'Erreur de connexion')
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
            <h1>Connexion Entreprise</h1>
            <p className="pro-login-subtitle">
              Accédez à votre espace de gestion de fidélité
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="pro-login-form">
            {/* Error Alert */}
            {error && (
              <div className="alert error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="pro-form-group">
              <label htmlFor="email">Email</label>
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
            </div>

            {/* Password Input */}
            <div className="pro-form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{ position: 'absolute', right: '10px', top: '34px', padding: '4px' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
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
                  <Loader2 className="animate-spin" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Info Text */}
          <p className="auth-card .info-text" style={{ fontSize: '12px', marginTop: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Utilisez les identifiants temporaires reçus de votre administrateur.<br/>
            Vous devrez changer le mot de passe à la première connexion.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProLogin
