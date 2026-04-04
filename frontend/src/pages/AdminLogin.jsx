import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './Auth.css'

function AdminLogin() {
  const [identifiant, setIdentifiant] = useState('')
  const [mot_de_passe, setMotDePasse] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await api.post('/admin/login', { identifiant, mot_de_passe })
      localStorage.setItem('token', response.data.token)
      navigate('/master-admin-secret/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Master Admin</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Identifiant"
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
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
      </div>
    </div>
  )
}

export default AdminLogin
