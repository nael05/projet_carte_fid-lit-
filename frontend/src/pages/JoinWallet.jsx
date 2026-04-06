import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'
import CustomerCard from '../components/CustomerCard'
import './JoinWallet.css'

function JoinWallet() {
  const { entrepriseId } = useParams()
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [type_wallet, setTypeWallet] = useState('apple')
  const [company, setCompany] = useState(null)
  const [customization, setCustomization] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadCompanyInfo()
  }, [entrepriseId])

  const loadCompanyInfo = async () => {
    try {
      const response = await api.get(`/companies/${entrepriseId}/info`)
      setCompany(response.data)
      
      // Charger la personnalisation de la carte (route publique)
      try {
        const customResp = await api.get(`/companies/${entrepriseId}/card-customization?loyaltyType=${response.data.loyalty_type || 'points'}`)
        setCustomization(customResp.data)
      } catch (err) {
        console.log('Pas de personnalisation personnalisée, utiliser les valeurs par défaut')
      }
    } catch (err) {
      setError('Entreprise non trouvée')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post(`/join/${entrepriseId}`, {
        nom,
        prenom,
        telephone,
        type_wallet
      })

      if (type_wallet === 'apple') {
        // Télécharger le fichier pkpass pour Apple Wallet
        if (response.data instanceof Blob) {
          const url = window.URL.createObjectURL(response.data)
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `${prenom}-${nom}-loyalty.pkpass`)
          document.body.appendChild(link)
          link.click()
          link.parentNode.removeChild(link)
          window.URL.revokeObjectURL(url)
        }
        setSuccess(true)
      } else if (type_wallet === 'google') {
        // Google Wallet - Ouvrir le lien de sauvegarde
        if (response.data?.walletsaveUrl) {
          window.open(response.data.walletsaveUrl, '_blank')
        }
        setSuccess(true)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur créer la carte')
    } finally {
      setLoading(false)
    }
  }

  if (!company) {
    return (
      <div className="join-container">
        <div className="join-card">
          <p>{error || 'Chargement...'}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="join-container">
        <div className="join-card success">
          <h1>Carte créée !</h1>
          <p>Votre carte de fidélité a été ajoutée à votre wallet.</p>
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
            Commencez à accumuler des points à chaque visite !
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="join-container">
      <div className="join-layout">
        {/* Form Section */}
        <div className="join-card">
          <h1>{company.nom}</h1>
          <p className="subtitle">Créer votre carte de fidélité</p>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Prénom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="Numéro de téléphone"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
            />

            <label>Choisir votre wallet :</label>
            <select
              value={type_wallet}
              onChange={(e) => setTypeWallet(e.target.value)}
            >
              <option value="apple">Apple Wallet</option>
              <option value="google">Google Wallet</option>
            </select>

            {error && <p className="error">{error}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Création en cours...' : 'Créer et Ajouter ma carte'}
            </button>
          </form>

          <div className="reward-info">
            <h3>Votre récompense :</h3>
            <p>{company.recompense_definition}</p>
          </div>
        </div>

        {/* Card Preview Section */}
        {customization && (
          <div className="card-preview-section">
            <h3>Aperçu de votre carte</h3>
            <CustomerCard
              client={{
                prenom: prenom || 'Prénom',
                nom: nom || 'Nom',
                telephone: telephone || '---',
                points: 0,
                stamps_collected: 0,
                stamps_total: 10,
                type_wallet: type_wallet
              }}
              loyaltyType={company.loyalty_type === 'stamps' ? 'stamps' : 'points'}
              customization={customization}
              companyName={company.nom}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default JoinWallet
