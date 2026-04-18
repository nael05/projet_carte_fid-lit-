import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { AlertCircle, Loader2, Eye, EyeOff, Building2, HelpCircle } from 'lucide-react'
import './Auth.css'

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

  // Theme initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-mode')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark-mode')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated && role === 'pro' && !redirectedRef.current) {
      redirectedRef.current = true
      navigate('/pro/dashboard')
    }
  }, [authLoading, isAuthenticated, role, navigate])

  // Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail')
    if (remembered) {
      setEmail(remembered)
      setRememberMe(true)
    }
  }, [])

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
        login(response.data.token, 'pro', response.data.mustChangePassword)
        
        if (response.data.companyId) {
          localStorage.setItem('companyId', response.data.companyId)
          localStorage.setItem('companyName', response.data.nom)
        }

        if (response.data.deviceId) {
          localStorage.setItem('deviceId', response.data.deviceId)
        }
        
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email)
        } else {
          localStorage.removeItem('rememberedEmail')
        }

        const mustChange = response.data.mustChangePassword === true
        
        if (mustChange) {
          navigate('/pro/secure-password', { 
            state: { email, firstTime: true, fromLogin: true } 
          })
        } else {
          navigate('/pro/dashboard')
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Email ou mot de passe incorrect')
      } else if (err.response?.status === 403) {
        setError('Compte suspendu')
      } else {
        setError('Problème de connexion')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="luxe-auth-container">
      <div className="luxe-auth-bg"></div>
      
      <div className="luxe-auth-card">
        <div className="luxe-auth-header">
          <h1>Espace Pro</h1>
          <p>Gérez votre programme de fidélité</p>
        </div>

        <form onSubmit={handleSubmit} className="luxe-auth-form">
          <div className="luxe-form-group">
            <label htmlFor="email">Email professionnel</label>
            <input
              id="email"
              className="luxe-input"
              type="email"
              placeholder="contact@commerce.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </div>

          <div className="luxe-form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              className="luxe-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-15px', marginBottom: '15px' }}>
            <Link to="/pro/forgot-password" style={{ fontSize: '13px', color: '#6366F1', textDecoration: 'none', fontWeight: '500' }}>
              Mot de passe oublié ?
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '-12px' }}>
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#007AFF' }}
            />
            <label htmlFor="remember" style={{ fontSize: '13px', color: '#94A3B8', cursor: 'pointer', marginBottom: 0 }}>
              Se souvenir de moi
            </label>
          </div>

          {error && (
            <div className="luxe-alert error">
              <AlertCircle size={18} /> <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-luxe-submit"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spin" size={20} />
            ) : (
              <>Se connecter</>
            )}
          </button>
        </form>

        <div className="luxe-auth-footer">
          <p>© 2026 Fidelyz • Business Portal</p>
        </div>
      </div>
    </div>
  )
}

export default ProLogin
