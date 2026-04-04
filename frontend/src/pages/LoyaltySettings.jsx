import React, { useState, useEffect } from 'react'
import api from '../api'

function LoyaltySettings() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await api.get('/pro/loyalty/config')
      setConfig(response.data)
      setFormData(response.data)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) : value
    })
  }

  const handleSave = async () => {
    try {
      setError('')
      setSuccess('')
      await api.put('/pro/loyalty/config', formData)
      setConfig(formData)
      setEditing(false)
      setSuccess('Configuration mise à jour avec succès!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la mise à jour')
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Chargement...</div>
  }

  if (!config) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Aucune configuration trouvée</div>
  }

  const loyaltyType = config.loyalty_type

  return (
    <div className="card">
      <h2>⚙️ Configuration Système de Fidélité</h2>

      {error && <div className="alert error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && <div className="alert success" style={{ marginBottom: '15px' }}>{success}</div>}

      {!editing ? (
        <>
          <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
            <p><strong>Type de fidélité :</strong> {loyaltyType === 'points' ? 'Points' : 'Tampons'}</p>

            {loyaltyType === 'points' ? (
              <>
                <p><strong>Points par achat :</strong> {config.points_per_purchase}</p>
                <p><strong>Points pour récompense :</strong> {config.points_for_reward}</p>
              </>
            ) : (
              <>
                <p><strong>Total de tampons :</strong> {config.stamps_count}</p>
                <p><strong>Tampons par achat :</strong> {config.stamps_per_purchase}</p>
                <p><strong>Tampons pour récompense :</strong> {config.stamps_for_reward}</p>
              </>
            )}

            <p><strong>Titre de récompense :</strong> {config.reward_title}</p>
            <p><strong>Notifications push :</strong> {config.push_notifications_enabled ? 'Activées' : 'Désactivées'}</p>
          </div>

          <button
            className="btn-primary"
            onClick={() => setEditing(true)}
          >
            Modifier la configuration
          </button>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {loyaltyType === 'points' && (
            <>
              <label>
                Points par achat :
                <input
                  type="number"
                  name="points_per_purchase"
                  value={formData.points_per_purchase || 1}
                  onChange={handleInputChange}
                  min="1"
                  style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px' }}
                />
              </label>

              <label>
                Points pour débloquer récompense :
                <input
                  type="number"
                  name="points_for_reward"
                  value={formData.points_for_reward || 10}
                  onChange={handleInputChange}
                  min="1"
                  style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px' }}
                />
              </label>
            </>
          )}

          {loyaltyType === 'stamps' && (
            <>
              <label>
                Nombre total de tampons :
                <input
                  type="number"
                  name="stamps_count"
                  value={formData.stamps_count || 10}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px' }}
                />
              </label>

              <label>
                Tampons par achat :
                <input
                  type="number"
                  name="stamps_per_purchase"
                  value={formData.stamps_per_purchase || 1}
                  onChange={handleInputChange}
                  min="1"
                  style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px' }}
                />
              </label>

              <label>
                Tampons pour débloquer récompense :
                <input
                  type="number"
                  name="stamps_for_reward"
                  value={formData.stamps_for_reward || 10}
                  onChange={handleInputChange}
                  min="1"
                  style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px' }}
                />
              </label>
            </>
          )}

          <label>
            Titre de la récompense :
            <input
              type="text"
              name="reward_title"
              value={formData.reward_title || ''}
              onChange={handleInputChange}
              style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px' }}
            />
          </label>

          <label>
            Description de la récompense :
            <textarea
              name="reward_description"
              value={formData.reward_description || ''}
              onChange={handleInputChange}
              style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px', minHeight: '80px' }}
            />
          </label>

          <label>
            Clé Apple Wallet :
            <input
              type="text"
              name="apple_wallet_key"
              value={formData.apple_wallet_key || ''}
              onChange={handleInputChange}
              placeholder="Votre clé Apple Wallet"
              style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px', fontFamily: 'monospace' }}
            />
          </label>

          <label>
            Clé Google Wallet :
            <input
              type="text"
              name="google_wallet_key"
              value={formData.google_wallet_key || ''}
              onChange={handleInputChange}
              placeholder="Votre clé Google Wallet"
              style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px', fontFamily: 'monospace' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
            <input
              type="checkbox"
              name="push_notifications_enabled"
              checked={formData.push_notifications_enabled !== false}
              onChange={(e) => setFormData({ ...formData, push_notifications_enabled: e.target.checked })}
              style={{ marginRight: '10px' }}
            />
            Activer les notifications push
          </label>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-success">
              Enregistrer
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditing(false)
                setFormData(config)
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default LoyaltySettings
