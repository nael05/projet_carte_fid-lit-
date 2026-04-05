import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5QrcodeScanner } from 'html5-qrcode'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import DeviceManager from './DeviceManager'
import LoyaltySettings from './LoyaltySettings'
import PushNotifications from './PushNotifications'
import CardCustomizer from '../components/CardCustomizer'
import CustomerCard from '../components/CustomerCard'
import './Dashboard.css'

function ProDashboard() {
  const [activeTab, setActiveTab] = useState('scanner')
  const [clients, setClients] = useState([])
  const [scannerActive, setScannerActive] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [reward, setReward] = useState(null)
  const [proInfo, setProInfo] = useState(null)
  const [loyaltyType, setLoyaltyType] = useState('points')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [customization, setCustomization] = useState(null)
  const [selectedClientCard, setSelectedClientCard] = useState(null)
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const { token, isSuspended, logout } = useAuth()

  useEffect(() => {
    if (!token) {
      navigate('/pro/login')
    } else {
      loadProInfo()
      loadClients()
    }
  }, [token, navigate])

  useEffect(() => {
    if (activeTab === 'scanner' && scannerActive && scannerRef.current) {
      initScanner()
    } else if (activeTab !== 'scanner') {
      destroyScanner()
    }
  }, [activeTab, scannerActive])

  const loadProInfo = async () => {
    try {
      const response = await api.get('/pro/info')
      setProInfo(response.data)
      setLoyaltyType(response.data.loyalty_type || 'points')
      
      // Charger la customization de la carte avec le type de loyauté
      try {
        const loyaltyType = response.data.loyalty_type || 'points'
        const customResp = await api.get(`/pro/card-customization/${response.data.id}?loyaltyType=${loyaltyType}`)
        setCustomization(customResp.data)
      } catch (err) {
        console.log('Pas de personnalisation, utiliser les valeurs par défaut')
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Erreur chargement pro info:', err)
      setPageError('Erreur lors du chargement des informations entreprise')
      setLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const response = await api.get('/pro/clients')
      setClients(response.data)
    } catch (err) {
      console.error('Erreur chargement clients:', err)
      setPageError('Erreur lors du chargement de la liste des clients')
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
      
      const successData = {
        success: true,
        clientName: response.data.clientName,
        rewardUnlocked: response.data.rewardUnlocked,
        rewardTitle: response.data.rewardTitle
      }

      if (loyaltyType === 'points') {
        successData.points = response.data.newPoints
        successData.message = response.data.message
      } else {
        successData.stamps = response.data.newStamps
        successData.message = response.data.message
      }

      setLastScan(successData)
      setReward(response.data.rewardUnlocked ? response.data.rewardTitle : null)
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

      {/* Page de chargement */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 30px', color: '#999' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>Chargement des données...</div>
        </div>
      )}

      {/* Affichage des erreurs */}
      {pageError && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          padding: '15px 30px',
          margin: '20px 30px',
          color: '#721c24'
        }}>
          {pageError}
        </div>
      )}

      {/* Contenu principal - visible seulement si chargé */}
      {!loading && (
        <>
          {isSuspended && (
            <div style={{
              backgroundColor: '#f8d7da',
              border: '2px solid #f5c6cb',
              borderRadius: '8px',
              padding: '20px',
              margin: '20px 30px',
              textAlign: 'center'
            }}>
              <h2 style={{ color: '#721c24', margin: '0 0 10px 0' }}>Compte Suspendu</h2>
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
              <strong>Palier atteint !</strong>
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
                  <strong>{lastScan.clientName}</strong>
                  <p>{lastScan.message}</p>
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
            Scanner QR
          </button>
          <button
            className={`tab ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            Clients
          </button>
          <button
            className={`tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            Fidélité
          </button>
          <button
            className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
          <button
            className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
            onClick={() => setActiveTab('devices')}
          >
            Appareils (24h)
          </button>
          <button
            className={`tab ${activeTab === 'card-design' ? 'active' : ''}`}
            onClick={() => setActiveTab('card-design')}
          >
            Design Carte
          </button>
        </div>

        {/* Scanner Tab */}
        <div className={`tab-content ${activeTab === 'scanner' ? 'active' : ''}`}>
          <div className="card">
            <h2>Scanner QR Code</h2>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              Positionnez le QR code du client face à la caméra pour {loyaltyType === 'points' ? 'ajouter des points' : 'ajouter des tampons'}.
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
                    <th>{loyaltyType === 'points' ? 'Points' : 'Tampons'}</th>
                    <th>Wallet</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.prenom} {client.nom}</td>
                      <td>{client.telephone}</td>
                      <td>
                        <strong>
                          {loyaltyType === 'points' 
                            ? client.points 
                            : `${client.stamps_collected || 0}/${proInfo?.stamps_count || 10}`}
                        </strong>
                      </td>
                      <td>{client.type_wallet === 'apple' ? 'Apple' : 'Google'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-primary"
                            onClick={() => setSelectedClientCard(client)}
                            title="Voir la carte"
                          >
                            Carte
                          </button>
                          <button
                            className="btn-success"
                            onClick={() => adjustPoints(client.id, 1)}
                            title={loyaltyType === 'points' ? '+1 point' : '+1 tampon'}
                          >
                            +1
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => adjustPoints(client.id, -1)}
                            title={loyaltyType === 'points' ? '-1 point' : '-1 tampon'}
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

        {/* Loyalty Config Tab */}
        <div className={`tab-content ${activeTab === 'config' ? 'active' : ''}`}>
          <LoyaltySettings />
        </div>

        {/* Push Notifications Tab */}
        <div className={`tab-content ${activeTab === 'notifications' ? 'active' : ''}`}>
          <PushNotifications />
        </div>

        {/* Devices Tab - 24h Session Management */}
        <div className={`tab-content ${activeTab === 'devices' ? 'active' : ''}`}>
          <DeviceManager />
        </div>

        {/* Card Design Tab */}
        <div className={`tab-content ${activeTab === 'card-design' ? 'active' : ''}`}>
          <CardCustomizer companyId={proInfo?.id} loyaltyType={loyaltyType} />
        </div>
          </div>
        </>
      )}

      {/* Client Card Modal */}
      {selectedClientCard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedClientCard(null)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
            
            <CustomerCard
              client={selectedClientCard}
              loyaltyType={loyaltyType}
              customization={customization}
              companyName={proInfo?.nom}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ProDashboard
