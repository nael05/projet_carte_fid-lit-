import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validatePassword } from '../utils/passwordValidator'
import api from '../api'
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle2, Circle } from 'lucide-react'
import './Auth.css'
import './ProResetPassword.css'

function ProResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { token, updateMustChangePassword } = useAuth()

  // Theme initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('fidelyz-theme')
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [])

  // Vérifier que l'user peut accéder à cette page
  useEffect(() => {
    const fromProLogin = location.state?.fromLogin
    
    if (!token && !fromProLogin) {
      navigate('/pro/login')
    }
  }, [token, navigate, location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (newPassword !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas')
        setLoading(false)
        return
      }

      const validation = validatePassword(newPassword)
      if (!validation.isValid) {
        setError(`Le mot de passe ne respecte pas les critères`)
        setLoading(false)
        return
      }

      await api.put('/pro/change-password', { newPassword })
      updateMustChangePassword(false)
      setSuccess(true)
      
      setTimeout(() => {
        navigate('/pro/dashboard')
      }, 2000)
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expirée. Reconnexion requise.')
        setTimeout(() => navigate('/pro/login'), 2000)
      } else {
        setError(err.response?.data?.error || 'Erreur lors du changement de mot de passe')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="luxe-auth-container">
        <div className="luxe-auth-card">
          <div className="luxe-auth-header">
            <div className="luxe-icon-success" style={{ margin: '0 auto 24px' }}>
              <CheckCircle2 size={48} color="#10B981" />
            </div>
            <h1>Mot de passe mis à jour</h1>
            <p>Sécurisation terminée avec succès.</p>
          </div>
          <p style={{ textAlign: 'center', color: '#10B981', fontWeight: '600' }}>
            Redirection vers votre espace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="luxe-auth-container">
      <div className="luxe-auth-bg"></div>
      
      <div className="luxe-auth-card">
        <div className="luxe-auth-header">
          <h1>Sécritisé votre compte</h1>
          <p>Choisissez un nouveau mot de passe robuste</p>
        </div>
        
        <form onSubmit={handleSubmit} className="luxe-auth-form">
          <div className="luxe-form-group">
            <label htmlFor="newPassword">Nouveau mot de passe</label>
            <input
              id="newPassword"
              className="luxe-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

          <div className="luxe-form-group">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              id="confirmPassword"
              className="luxe-input"
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex="-1"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {newPassword && (
            <div className="luxe-criteria-box">
              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Sécurité Requise</span>
              <ul className="luxe-criteria-list">
                <li className={`luxe-criteria-item ${newPassword.length >= 6 ? 'valid' : ''}`}>
                  {newPassword.length >= 6 ? <CheckCircle2 size={14} /> : <Circle size={14} />} 6 caractères min.
                </li>
                <li className={`luxe-criteria-item ${/(?=.*[A-Z])/.test(newPassword) ? 'valid' : ''}`}>
                  {/(?=.*[A-Z])/.test(newPassword) ? <CheckCircle2 size={14} /> : <Circle size={14} />} Une majuscule
                </li>
                <li className={`luxe-criteria-item ${/(?=.*[0-9!@#$%^&*])/.test(newPassword) ? 'valid' : ''}`}>
                  {/(?=.*[0-9!@#$%^&*])/.test(newPassword) ? <CheckCircle2 size={14} /> : <Circle size={14} />} Chiffre / Spécial
                </li>
              </ul>
            </div>
          )}

          {error && (
            <div className="luxe-alert error">
              <AlertCircle size={18} /> <span>{error}</span>
            </div>
          )}
          
          <button type="submit" className="btn-luxe-submit" disabled={loading || !newPassword || !confirmPassword}>
            {loading ? (
              <Loader2 className="spin" size={20} />
            ) : (
              'Valider le mot de passe'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProResetPassword
