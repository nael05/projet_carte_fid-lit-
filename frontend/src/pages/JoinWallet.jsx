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
  const [company, setCompany] = useState(null)
  const [customization, setCustomization] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('form') // 'form', 'wallets', 'success'
  const [createdClientId, setCreatedClientId] = useState(null)

  useEffect(() => {
    loadCompanyInfo()
  }, [entrepriseId])

  const loadCompanyInfo = async () => {
    try {
      const response = await api.get(`/companies/${entrepriseId}/info`)
      setCompany(response.data)
      
      try {
        const customResp = await api.get(`/companies/${entrepriseId}/card-customization?loyaltyType=${response.data.loyalty_type || 'points'}`)
        setCustomization(customResp.data)
      } catch (err) {
        console.log('Pas de personnalisation personnalisée')
      }
    } catch (err) {
      setError('Entreprise non trouvée')
    }
  }

  // Étape 1: Soumettre le formulaire (créer le client)
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Pour créer le client, on doit passer par Apple ou Google
      // Pour maintenant, on crée simplement le client et on stocke ses données
      setCreatedClientId({ nom, prenom, telephone })
      setStep('wallets')
    } catch (err) {
      setError('Erreur lors de la création du formulaire')
    } finally {
      setLoading(false)
    }
  }

  // Étape 2: Créer la carte pour Apple Wallet
  const addToAppleWallet = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.post(`/join/${entrepriseId}`, {
        nom: createdClientId.nom,
        prenom: createdClientId.prenom,
        telephone: createdClientId.telephone,
        type_wallet: 'apple'
      })

      if (response.data instanceof Blob) {
        const url = window.URL.createObjectURL(response.data)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${createdClientId.prenom}-${createdClientId.nom}-loyalty.pkpass`)
        document.body.appendChild(link)
        link.click()
        link.parentNode.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
      setStep('success')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur création Apple Wallet')
    } finally {
      setLoading(false)
    }
  }

  // Étape 2: Créer la carte pour Google Wallet
  const addToGoogleWallet = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.post(`/join/${entrepriseId}`, {
        nom: createdClientId.nom,
        prenom: createdClientId.prenom,
        telephone: createdClientId.telephone,
        type_wallet: 'google'
      })

      if (response.data?.saveUrl) {
        window.open(response.data.saveUrl, '_blank')
      }
      setStep('success')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur création Google Wallet')
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

  // ÉTAPE 1: Formulaire
  if (step === 'form') {
    return (
      <div className="join-container">
        <div className="join-card">
          <h1>{company.nom}</h1>
          <p className="subtitle">Créer votre carte de fidélité</p>

          <form onSubmit={handleFormSubmit}>
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

            {error && <p className="error">{error}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Chargement...' : 'Générer ma carte'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ÉTAPE 2: Choix du wallet
  if (step === 'wallets') {
    return (
      <div className="join-container">
        <div className="join-card">
          <h2>Ajouter à votre wallet</h2>
          <p className="info">Choisissez votre portefeuille numérique préféré</p>

          <div className="wallet-buttons">
            <button
              className="wallet-btn apple-wallet"
              onClick={addToAppleWallet}
              disabled={loading}
            >
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M17.05 13.5c-.91 0-1.82-.45-1.82-1.5h5.5c0 .5.07 1 .27 1.5M13.5 7c2 0 2.75 1.5 2.75 3h-5.5c0-1.5.75-3 2.75-3M18.5 18H7c-1.1 0-2-.9-2-2v-6c0-1.1.9-2 2-2h11.5c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2z'/%3E%3C/svg%3E" alt="Apple Wallet" />
              Add to Apple Wallet
            </button>

            <button
              className="wallet-btn google-wallet"
              onClick={addToGoogleWallet}
              disabled={loading}
            >
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 9h-3v3h-1v-3h-3v-1h3V8h1v3h3v1z'/%3E%3C/svg%3E" alt="Google Wallet" />
              Add to Google Wallet
            </button>
          </div>

          {error && <p className="error">{error}</p>}

          <button
            className="btn-secondary"
            onClick={() => setStep('form')}
            disabled={loading}
            style={{ marginTop: '20px' }}
          >
            ← Retour
          </button>
        </div>
      </div>
    )
  }

  // ÉTAPE 3: Succès
  if (step === 'success') {
    return (
      <div className="join-container">
        <div className="join-card success">
          <h1>✓ Carte créée !</h1>
          <p>Votre carte de fidélité a été ajoutée à votre wallet.</p>
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
            Commencez à accumuler des points à chaque visite !
          </p>
        </div>
      </div>
    )
  }
}

export default JoinWallet
