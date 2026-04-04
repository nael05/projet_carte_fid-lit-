import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5QrcodeScanner } from 'html5-qrcode'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import DeviceManager from './DeviceManager'
import './Dashboard.css'

function ProDashboard() {
  const [activeTab, setActiveTab] = useState('scanner')
  const [clients, setClients] = useState([])
  const [scannerActive, setScannerActive] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [reward, setReward] = useState(null)
  const [rewardText, setRewardText] = useState('')
  const [editingReward, setEditingReward] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const { token, isSuspended, logout } = useAuth()

  useEffect(() => {
    if (!token) {
      navigate('/pro/login')
    } else {
      loadClients()
      loadReward()
    }
  }, [token, navigate])

  useEffect(() => {
    if (activeTab === 'scanner' && scannerActive && scannerRef.current) {
      initScanner()
    } else if (activeTab !== 'scanner') {
      destroyScanner()
    }
  }, [activeTab, scannerActive])

  const loadClients = async () => {
    try {
      const response = await api.get('/pro/clients')
      setClients(response.data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadReward = async () => {
    try {
      const response = await api.get('/pro/info')
      setRewardText(response.data.recompense_definition)
    } catch (err) {
      console.error(err)
    }
  }

  const initScanner = () => {
    if (scannerRef.current && !scannerRef.current.querySelector('iframe')) {
      const scanner = new Html5QrcodeScanner(
        'qr-scanner',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )

      scanner.render(
        async (decodedText) => {
          handleScan(decodedText)
          scanner.clear()
          setScannerActive(false)
        },
        (err) => console.warn(err)
      )
    }
  }

  const destroyScanner = () => {
    if (scannerRef.current) {
      Html5QrcodeScanner.getCameras().then(() => {
        try {
          Html5QrcodeScanner.prototype.clear?.call({})
        } catch (e) {}
      })
    }
  }

  const handleScan = async (clientId) => {
    try {
      setLoading(true)
      const response = await api.post('/pro/scan', { clientId })
      setLastScan({
        success: true,
        clientName: response.data.clientName,
        points: response.data.newPoints,
        rewardUnlocked: response.data.rewardUnlocked,
        rewardText: response.data.rewardText
      })
      setReward(response.data.rewardUnlocked ? response.data.rewardText : null)
      setTimeout(() => setLastScan(null), 5000)
      loadClients()
    } catch (err) {
      setLastScan({
        success: false,
        error: err.response?.data?.error || 'Erreur scan'
      })
      setTimeout(() => setLastScan(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const adjustPoints = async (clientId, adjustment) => {
    try {
      await api.put(`/pro/adjust-points/${clientId}`, { adjustment })
      loadClients()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
  }

  const handleUpdateReward = async () => {
    try {
      await api.put('/pro/update-reward', { recompense_definition: rewardText })
      setEditingReward(false)
      alert('Récompense mise à jour')
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/pro/login')
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard {localStorage.getItem('companyName')}</h1>
        <button className="btn-secondary" onClick={handleLogout}>Déconnexion</button>
      </div>

      {/* Messages d'alerte de suspension - Visible même si suspendu */}
      {isSuspended && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '2px solid #f5c6cb',
          borderRadius: '8px',
          padding: '20px',
          margin: '20px 30px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#721c24', margin: '0 0 10px 0' }}>⛔ Compte Suspendu</h2>
          <p style={{ color: '#721c24', margin: '0', fontSize: '16px' }}>
            Votre compte est temporairement suspendu. Toutes les fonctionnalités sont indisponibles.
          </p>
          <p style={{ color: '#721c24', margin: '10px 0 0 0', fontSize: '14px' }}>
            Veuillez contacter l'administrateur pour plus de détails.
          </p>
        </div>
      )}

      <div className="dashboard-content" style={{ opacity: isSuspended ? 0.5 : 1, pointerEvents: isSuspended ? 'none' : 'auto' }}>
        {reward && (
          <div className="alert success" style={{ fontSize: '16px', padding: '20px' }}>
            <div>
              <strong>🎉 Palier atteint !</strong>
              <p>{reward}</p>
            </div>
            <button className="alert-close" onClick={() => setReward(null)}>×</button>
          </div>
        )}

        {lastScan && (
          <div className={`alert ${lastScan.success ? 'success' : 'error'}`}>
            <div>
              {lastScan.success ? (
                <>
                  <strong>✓ {lastScan.clientName}</strong>
                  <p>+1 point (Total: {lastScan.points})</p>
                </>
              ) : (
                <>{lastScan.error}</>
              )}
            </div>
            <button className="alert-close" onClick={() => setLastScan(null)}>×</button>
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
          >
            📱 Scanner QR
          </button>
          <button
            className={`tab ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            👥 Clients
          </button>
          <button
            className={`tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            ⚙️ Configuration
          </button>
          <button
            className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
            onClick={() => setActiveTab('devices')}
          >
            🔐 Appareils (24h)
          </button>
        </div>

        {/* Scanner Tab */}
        <div className={`tab-content ${activeTab === 'scanner' ? 'active' : ''}`}>
          <div className="card">
            <h2>Scanner QR Code</h2>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              Positionnez le QR code du client face à la caméra pour ajouter des points.
            </p>

            {!scannerActive ? (
              <button
                className="btn-primary"
                onClick={() => setScannerActive(true)}
                style={{ marginBottom: '20px' }}
              >
                Démarrer le scanner
              </button>
            ) : (
              <>
                <div id="qr-scanner" ref={scannerRef} style={{ marginBottom: '20px' }}></div>
                <button
                  className="btn-secondary"
                  onClick={() => setScannerActive(false)}
                >
                  Arrêter le scanner
                </button>
              </>
            )}
          </div>
        </div>

        {/* Clients Tab */}
        <div className={`tab-content ${activeTab === 'clients' ? 'active' : ''}`}>
          <div className="card">
            <h2>Liste des Clients</h2>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Téléphone</th>
                    <th>Points</th>
                    <th>Wallet</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.prenom} {client.nom}</td>
                      <td>{client.telephone}</td>
                      <td><strong>{client.points}</strong></td>
                      <td>{client.type_wallet === 'apple' ? '🍎 Apple' : '🔴 Google'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-success"
                            onClick={() => adjustPoints(client.id, 1)}
                          >
                            +1
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => adjustPoints(client.id, -1)}
                          >
                            -1
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {clients.length === 0 && (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                Aucun client pour le moment
              </p>
            )}
          </div>
        </div>

        {/* Config Tab */}
        <div className={`tab-content ${activeTab === 'config' ? 'active' : ''}`}>
          <div className="card">
            <h2>Configuration de la Récompense</h2>
            {!editingReward ? (
              <>
                <p style={{ marginBottom: '15px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px' }}>
                  <strong>Texte actuel :</strong> {rewardText}
                </p>
                <button
                  className="btn-primary"
                  onClick={() => setEditingReward(true)}
                >
                  Modifier
                </button>
              </>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateReward(); }}>
                <textarea
                  value={rewardText}
                  onChange={(e) => setRewardText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'Arial',
                    marginBottom: '15px'
                  }}
                  required
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-success">
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditingReward(false)
                      loadReward()
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Devices Tab - 24h Session Management */}
        <div className={`tab-content ${activeTab === 'devices' ? 'active' : ''}`}>
          <DeviceManager />
        </div>
      </div>
    </div>
  )
}

export default ProDashboard
