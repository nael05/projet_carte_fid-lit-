import React, { useState, useEffect } from 'react'
import api from '../api'

function PushNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_type: 'all',
    target_segment: null
  })

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await api.get('/pro/notifications/history')
      setNotifications(response.data.notifications || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSendNotification = async (e) => {
    e.preventDefault()
    try {
      setError('')
      setSuccess('')

      if (!formData.title || !formData.message) {
        setError('Veuillez remplir le titre et le message')
        return
      }

      await api.post('/pro/notifications/send', {
        title: formData.title,
        message: formData.message,
        target_type: formData.target_type,
        target_segment: formData.target_type === 'segment' ? formData.target_segment : null
      })

      setSuccess('Notification envoyée avec succès!')
      setFormData({ title: '', message: '', target_type: 'all', target_segment: null })
      setShowForm(false)
      setTimeout(() => setSuccess(''), 3000)
      setTimeout(() => loadNotifications(), 1000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi')
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Chargement...</div>
  }

  return (
    <div className="card">
      <h2>📢 Notifications Push</h2>

      {error && <div className="alert error" style={{ marginBottom: '15px' }}>{error}</div>}
      {success && <div className="alert success" style={{ marginBottom: '15px' }}>{success}</div>}

      {!showForm ? (
        <button
          className="btn-primary"
          onClick={() => setShowForm(true)}
          style={{ marginBottom: '20px' }}
        >
          ➕ Envoyer une notification
        </button>
      ) : (
        <form onSubmit={handleSendNotification} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <h3>Créer une notification</h3>

          <label>
            Titre :
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Ex: Promotion spéciale"
              style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px' }}
              required
            />
          </label>

          <label>
            Message :
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Ex: Profitez de 20% de réduction aujourd'hui!"
              style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px', minHeight: '100px' }}
              required
            />
          </label>

          <label>
            Cible :
            <select
              name="target_type"
              value={formData.target_type}
              onChange={handleInputChange}
              style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px' }}
            >
              <option value="all">Tous les clients</option>
              <option value="segment">Un segment spécifique</option>
            </select>
          </label>

          {formData.target_type === 'segment' && (
            <label>
              Segment :
              <select
                name="target_segment"
                value={formData.target_segment || ''}
                onChange={handleInputChange}
                style={{ display: 'block', marginTop: '5px', marginBottom: '15px', width: '100%', padding: '8px' }}
              >
                <option value="">-- Sélectionner --</option>
                <option value="active">Clients actifs (avec points/tampons)</option>
                <option value="inactive">Clients inactifs (0 point/tampon)</option>
              </select>
            </label>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-success">
              Envoyer
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Historique des notifications */}
      <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Historique</h3>
      
      {notifications.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
          Aucune notification envoyée
        </p>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Message</th>
                <th>Destinataires</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notif) => (
                <tr key={notif.id}>
                  <td><strong>{notif.title}</strong></td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {notif.message}
                  </td>
                  <td>{notif.recipients_count}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: notif.status === 'sent' ? '#d4edda' : '#fff3cd',
                      color: notif.status === 'sent' ? '#155724' : '#856404'
                    }}>
                      {notif.status === 'sent' ? 'Envoyée' : notif.status === 'draft' ? 'Brouillon' : notif.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(notif.created_at).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PushNotifications
