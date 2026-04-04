import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './Auth.css'

function ProResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    try {
      await api.put('/pro/change-password', { newPassword })
      setSuccess(true)
      setTimeout(() => {
        navigate('/pro/dashboard')
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>✓ Mot de passe changé</h1>
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
        <h1>Changer le mot de passe</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
          Première connexion détectée. Merci de changer votre mot de passe temporaire.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary">Changer le mot de passe</button>
        </form>
      </div>
    </div>
  )
}

export default ProResetPassword
