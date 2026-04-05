import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import './Auth.css'

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
  const { token } = useAuth()

  // Vérifier que l'user peut accéder à cette page
  useEffect(() => {
    // Permettre l'accès si:
    // 1. User vient depuis ProLogin ou
    // 2. User est authentifié (changement de mot de passe volontaire)
    // 3. Sinon rediriger vers login
    
    const fromProLogin = location.state?.firstTime
    
    if (!token && !fromProLogin) {
      navigate('/pro/login')
    }
  }, [token, navigate, location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (newPassword !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas')
        return
      }

      if (newPassword.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères')
        return
      }

      if (!/(?=.*[A-Z])/.test(newPassword)) {
        setError('Le mot de passe doit contenir une majuscule')
        return
      }

      if (!/(?=.*[0-9!@#$%^&*])/.test(newPassword)) {
        setError('Le mot de passe doit contenir un chiffre ou un caractère spécial')
        return
      }

      // Envoyer la requête
      await api.put('/pro/change-password', { newPassword })
      setSuccess(true)
      
      setTimeout(() => {
        navigate('/pro/dashboard')
      }, 1500)
    } catch (err) {
      console.error('Change password error:', err)
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
      <div className="auth-container">
        <div className="auth-card">
          <h1>Mot de passe changé</h1>
          <p style={{ textAlign: 'center', color: '#388e3c' }}>
            Redirection en cours...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🔒 Sécuriser votre compte</h1>
        <p style={{ textAlign: 'center', color: '#d32f2f', marginBottom: '20px', fontWeight: '600' }}>
          Première connexion détectée !<br/>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: '400' }}>Veuillez créer un nouveau mot de passe sécurisé</span>
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
              tabIndex={-1}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
              tabIndex={-1}
            >
              {showConfirm ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          
          {/* Password strength indicator */}
          {newPassword && (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              <p>Critères du mot de passe:</p>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li style={{ color: newPassword.length >= 6 ? '#388e3c' : '#999' }}>
                  {newPassword.length >= 6 ? '✓' : '○'} Au moins 6 caractères
                </li>
                <li style={{ color: /(?=.*[A-Z])/.test(newPassword) ? '#388e3c' : '#999' }}>
                  {/(?=.*[A-Z])/.test(newPassword) ? '✓' : '○'} Une majuscule
                </li>
                <li style={{ color: /(?=.*[0-9!@#$%^&*])/.test(newPassword) ? '#388e3c' : '#999' }}>
                  {/(?=.*[0-9!@#$%^&*])/.test(newPassword) ? '✓' : '○'} Un chiffre ou caractère spécial
                </li>
              </ul>
            </div>
          )}
          
          <button type="submit" className="btn-primary" disabled={loading || !newPassword || !confirmPassword}>
            {loading ? 'En cours...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProResetPassword
