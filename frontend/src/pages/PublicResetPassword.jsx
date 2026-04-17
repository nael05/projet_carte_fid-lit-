import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import api from '../api'
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle2, Circle, ArrowLeft } from 'lucide-react'
import './Auth.css'

function PublicResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  
  const queryParams = new URLSearchParams(location.search)
  const token = queryParams.get('token')

  // Initialisation du thème
  useEffect(() => {
    const savedTheme = localStorage.getItem('fidelyz-theme') || 'dark'
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setError('Lien de réinitialisation invalide ou manquant.')
    }
  }, [token])

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

      // Validation rigoureuse (Majuscule + Chiffre/Spécial + 6 chars)
      const hasMinLength = newPassword.length >= 6;
      const hasUppercase = /(?=.*[A-Z])/.test(newPassword);
      const hasSpecial = /(?=.*[0-9!@#$%^&*])/.test(newPassword);

      if (!hasMinLength || !hasUppercase || !hasSpecial) {
        setError('Le mot de passe ne respecte pas les critères de sécurité');
        setLoading(false);
        return;
      }

      await api.post('/pro/reset-password', { token, newPassword })
      setSuccess(true)
      
      setTimeout(() => {
        navigate('/pro/login')
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la réinitialisation')
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
            <h1>Mot de passe mis à jour</h1>
            <p>Votre nouveau mot de passe est maintenant actif.</p>
          </div>
          <p style={{ textAlign: 'center', color: '#10B981', fontWeight: '600' }}>
            Redirection vers la connexion...
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
          <h1>Nouveau mot de passe</h1>
          <p>Choisissez un mot de passe robuste pour votre sécurité</p>
        </div>
        
        {!token ? (
          <div className="luxe-alert error">
             <AlertCircle size={18} /> <span>{error}</span>
             <Link to="/pro/forgot-password" style={{ color: 'white', display: 'block', marginTop: '10px' }}>Demander un nouveau lien</Link>
          </div>
        ) : (
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
              <div className="luxe-criteria-box" style={{ marginTop: '8px' }}>
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
                'Enregistrer'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default PublicResetPassword
