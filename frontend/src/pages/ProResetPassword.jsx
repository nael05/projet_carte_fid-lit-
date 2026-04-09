import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validatePassword } from '../utils/passwordValidator'
import api from '../api'
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
      // ✅ Validation 1: Les mots de passe correspondent
      if (newPassword !== confirmPassword) {
        setError('❌ Les mots de passe ne correspondent pas')
        setLoading(false)
        return
      }

      // ✅ Validation 2: Les champs ne sont pas vides
      if (!newPassword || !confirmPassword) {
        setError('❌ Veuillez remplir tous les champs')
        setLoading(false)
        return
      }

      // ✅ Validation 3: Complexité du mot de passe
      const validation = validatePassword(newPassword)
      if (!validation.isValid) {
        setError(`❌ Exigences du mot de passe:\n${validation.errors.join('\n')}`)
        setLoading(false)
        return
      }

      // 📤 Envoyer la requête au backend
      console.log('📤 Envoi du changement de mot de passe...')
      await api.put('/pro/change-password', { newPassword })
      
      console.log('✅ Mot de passe changé avec succès')
      
      // 🔐 Réinitialiser le flag mustChangePassword
      updateMustChangePassword(false)
      
      setSuccess(true)
      
      // Redirection après 2 secondes
      setTimeout(() => {
        navigate('/pro/dashboard')
      }, 2000)
    } catch (err) {
      console.error('❌ Erreur change password:', err)
      
      if (err.response?.status === 401) {
        setError('❌ Session expirée. Reconnexion requise.')
        setTimeout(() => navigate('/pro/login'), 2000)
      } else if (err.response?.data?.error) {
        // Afficher les erreurs détaillées du backend
        const errorMsg = err.response.data.error
        const details = err.response.data.details
        setError(`❌ ${errorMsg}${details ? '\n' + details.join('\n') : ''}`)
      } else {
        setError('❌ Erreur lors du changement de mot de passe')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Mot de passe changé</h2>
          <p style={{ textAlign: 'center', color: '#065F46', margin: '0' }}>
            Redirection vers le tableau de bord...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Sécuriser votre compte</h2>
        <p style={{ textAlign: 'center', fontSize: '14px', marginBottom: '32px', lineHeight: '1.5' }}>
          Première connexion détectée ! Veuillez créer un nouveau mot de passe sécurisé.
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="newPassword">Nouveau mot de passe</label>
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Entrez un mot de passe sécurisé"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
              tabIndex={-1}
            >
              {showPassword ? 'Masquer' : 'Afficher'}
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirmez votre mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="toggle-password"
              tabIndex={-1}
            >
              {showConfirm ? 'Masquer' : 'Afficher'}
            </button>
          </div>

          {error && (
            <div className="error">
              {error}
            </div>
          )}
          
          {/* Password strength indicator */}
          {newPassword && (
            <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#4B5563' }}>Critères du mot de passe:</p>
              <ul style={{ margin: '0', paddingLeft: '20px', listStyle: 'none' }}>
                <li style={{ color: newPassword.length >= 6 ? '#065F46' : '#9CA3AF', fontSize: '13px' }}>
                  {newPassword.length >= 6 ? '✓' : '○'} Au moins 6 caractères
                </li>
                <li style={{ color: /(?=.*[A-Z])/.test(newPassword) ? '#065F46' : '#9CA3AF', fontSize: '13px' }}>
                  {/(?=.*[A-Z])/.test(newPassword) ? '✓' : '○'} Une majuscule
                </li>
                <li style={{ color: /(?=.*[0-9!@#$%^&*])/.test(newPassword) ? '#065F46' : '#9CA3AF', fontSize: '13px' }}>
                  {/(?=.*[0-9!@#$%^&*])/.test(newPassword) ? '✓' : '○'} Un chiffre ou caractère spécial
                </li>
              </ul>
            </div>
          )}
          
          <button type="submit" className="btn-primary" disabled={loading || !newPassword || !confirmPassword}>
            {loading ? (
              <>
                <span className="spinner"></span>
                En cours...
              </>
            ) : (
              'Changer le mot de passe'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProResetPassword
