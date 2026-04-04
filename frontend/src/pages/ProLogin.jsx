import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

function ProLogin() {
  const [email, setEmail] = useState('')
  const [mot_de_passe, setMotDePasse] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await api.post('/pro/login', { email, mot_de_passe })
      
      // 🆕 Stocker le token et deviceId
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('deviceId', response.data.deviceId)
      
      localStorage.setItem('companyId', response.data.companyId)
      localStorage.setItem('companyName', response.data.nom)

      // Utiliser le contexte Auth
      login(response.data.token, {
        id: response.data.companyId,
        nom: response.data.nom,
        statut: response.data.statut || 'actif',
        deviceId: response.data.deviceId
      })

      if (response.data.mustChangePassword) {
        navigate('/pro/reset-password')
      } else {
        navigate('/pro/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Connexion Commercant</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={mot_de_passe}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary">Connexion</button>
        </form>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '20px', textAlign: 'center' }}>
          💡 Restez connecté 24h sur cet appareil après votre dernière activité
        </p>
      </div>
    </div>
  )
}

export default ProLogin
