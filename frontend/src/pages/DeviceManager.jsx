import React, { useState, useEffect } from 'react'
import api from '../api'
import './Dashboard.css'

function DeviceManager() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const currentDeviceId = localStorage.getItem('deviceId')

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const response = await api.get('/pro/sessions')
      console.log('✅ Sessions chargées:', response.data)
      setSessions(response.data || [])
    } catch (err) {
      console.error('❌ Erreur loading sessions:', err.response?.data || err.message)
      setError('Impossible de charger les sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutDevice = async (deviceId) => {
    if (!window.confirm('Déconnecter cet appareil ?')) {
      return
    }

    try {
      const response = await api.post('/pro/logout-device', { deviceId })
      alert(response.data.message)
      loadSessions()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
  }

  const handleLogoutAll = async () => {
    if (!window.confirm('Déconnecter de TOUS les autres appareils ?')) {
      return
    }

    try {
      const response = await api.post('/pro/logout-all', { keepCurrent: true })
      alert(response.data.message)
      loadSessions()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
  }

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#999' }}>Chargement...</p>
  }

  return (
    <div className="card">
      <h2>📱 Gestion des Appareils</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Restez connecté 24h sur chaque appareil. Vous serez déconnecté lors d'une inactivité de 24h.
      </p>

      {error && (
        <div className="alert error" style={{ marginBottom: '20px' }}>
          <div>{error}</div>
        </div>
      )}

      {sessions.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
          Aucune session active
        </p>
      ) : (
        <>
          <div className="table-responsive" style={{ marginBottom: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>Appareil</th>
                  <th>Dernière Activité</th>
                  <th>Expiration</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.device_id} style={{
                    backgroundColor: session.isCurrentDevice ? '#e8f5e9' : 'transparent'
                  }}>
                    <td>
                      <strong>{session.device_name?.substring(0, 50)}</strong>
                      {session.isCurrentDevice && (
                        <span style={{ marginLeft: '10px', color: '#4caf50', fontWeight: 'bold' }}>
                          ✓ Cet appareil
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: '#999' }}>
                      {new Date(session.last_activity).toLocaleString('fr-FR')}
                    </td>
                    <td style={{ fontSize: '12px', color: '#999' }}>
                      {new Date(session.expiresIn).toLocaleString('fr-FR')}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        borderRadius: '3px',
                        fontSize: '11px'
                      }}>
                        🟢 Actif
                      </span>
                    </td>
                    <td>
                      {!session.isCurrentDevice && (
                        <button
                          className="btn-danger"
                          onClick={() => handleLogoutDevice(session.device_id)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          🔓 Déconnecter
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sessions.length > 1 && (
            <button
              className="btn-warning"
              onClick={handleLogoutAll}
              style={{ padding: '10px 20px' }}
            >
              🔐 Déconnecter tous les autres appareils
            </button>
          )}
        </>
      )}

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#666'
      }}>
        <p><strong>💡 Comment ça marche:</strong></p>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Vous restez connecté <strong>24h après votre dernière activité</strong> sur chaque appareil</li>
          <li>Un nouvel appareil = une nouvelle connexion requise</li>
          <li>Vous pouvez gérer vos appareils connectés ici</li>
          <li>Au bout de 24h d'inactivité, reconnecter vous</li>
        </ul>
      </div>
    </div>
  )
}

export default DeviceManager
