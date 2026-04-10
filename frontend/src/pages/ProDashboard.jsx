import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

import CardCustomizer from '../components/CardCustomizer'
import { LogOut, ScanLine, Users, Link as LinkIcon, Palette, Smartphone, X, Copy, Plus, Minus, AlertCircle, Loader2, ChevronRight, User, Phone, Award, Check, Bell, Send, History, Settings, Save } from 'lucide-react'
import './ProDashboard.css'

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

  const [copied, setCopied] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [pushTitle, setPushTitle] = useState('')
  const [pushMessage, setPushMessage] = useState('')
  const [selectedClients, setSelectedClients] = useState([])
  const [pushHistory, setPushHistory] = useState([])
  const [sendingPush, setSendingPush] = useState(false)
  const [loyaltyConfig, setLoyaltyConfig] = useState({
    points_for_reward: 10,
    reward_title: '',
    reward_description: ''
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const { token, isSuspended, logout } = useAuth()

  useEffect(() => {
    if (!token) {
      navigate('/pro/login')
    } else {
      loadProInfo()
      loadClients()
      loadPushHistory()
      loadLoyaltyConfig()
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
      try {
        const lt = response.data.loyalty_type || 'points'
        const customResp = await api.get(`/pro/card-customization/${response.data.id}?loyaltyType=${lt}`)
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
        try { Html5QrcodeScanner.prototype.clear?.call({}) } catch (e) {}
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
      setLastScan({ success: false, error: err.response?.data?.error || 'Erreur scan' })
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


  const handleLogout = () => { logout(); navigate('/pro/login') }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${proInfo.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const loadPushHistory = async () => {
    try {
      const resp = await api.get('/pro/push/history')
      setPushHistory(resp.data)
    } catch (err) {
      console.error('Erreur chargement historique push:', err)
    }
  }

  const loadLoyaltyConfig = async () => {
    try {
      const resp = await api.get('/pro/loyalty/config')
      setLoyaltyConfig(resp.data)
    } catch (err) {
      console.error('Erreur chargement config loyauté:', err)
    }
  }

  const handleSaveLoyaltyConfig = async (e) => {
    e.preventDefault()
    try {
      setSavingSettings(true)
      await api.put('/pro/loyalty/config', loyaltyConfig)
      alert('Paramètres de fidélité mis à jour !')
      loadProInfo() // Refresh proInfo for loyaltyType etc
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setSavingSettings(false)
    }
  }

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    )
  }

  const selectAllClients = () => {
    const notifiableClients = clients.filter(c => c.device_count > 0).map(c => c.id)
    if (selectedClients.length === notifiableClients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(notifiableClients)
    }
  }

  const handleSendPush = async (e) => {
    e.preventDefault()
    if (!pushTitle || !pushMessage || selectedClients.length === 0) {
      alert('Veuillez remplir tous les champs et sélectionner au moins un client.')
      return
    }

    try {
      setSendingPush(true)
      const response = await api.post('/pro/push/send', {
        clientIds: selectedClients,
        title: pushTitle,
        message: pushMessage
      })

      alert(response.data.message)
      setPushTitle('')
      setPushMessage('')
      setSelectedClients([])
      loadPushHistory()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de l\'envoi')
    } finally {
      setSendingPush(false)
    }
  }

  const filteredClients = clients.filter(c => {
    if (!clientSearch) return true
    const s = clientSearch.toLowerCase()
    return `${c.prenom} ${c.nom}`.toLowerCase().includes(s) || c.telephone?.includes(s)
  })

  const tabs = [
    { id: 'scanner', icon: ScanLine, label: 'Scanner' },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'notifications', icon: Bell, label: 'Push' },
    { id: 'register', icon: LinkIcon, label: 'Recruter' },
    { id: 'design', icon: Palette, label: 'Design' },
    { id: 'settings', icon: Settings, label: 'Réglages' }
  ]

  return (
    <div className="pro-dash">
      {/* ===== TOP BAR ===== */}
      <header className="pro-topbar">
        <div className="pro-topbar-left">
          <div className="pro-avatar">{(localStorage.getItem('companyName') || 'E')[0]}</div>
          <div>
            <h1 className="pro-company-name">{localStorage.getItem('companyName')}</h1>
            <span className="pro-badge">{loyaltyType === 'points' ? 'Points' : 'Tampons'} · {clients.length} client{clients.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <button className="pro-topbar-btn" onClick={handleLogout} title="Déconnexion">
          <LogOut size={18} />
        </button>
      </header>

      {/* ===== SUSPENDED BANNER ===== */}
      {isSuspended && (
        <div className="pro-suspended-banner">
          <AlertCircle size={20} />
          <div>
            <strong>Compte Suspendu</strong>
            <p>Contactez l'administrateur pour plus d'informations.</p>
          </div>
        </div>
      )}

      {/* ===== LOADING ===== */}
      {loading && (
        <div className="pro-loading">
          <Loader2 size={28} className="pro-spin" />
          <p>Chargement...</p>
        </div>
      )}

      {/* ===== ERROR ===== */}
      {pageError && (
        <div className="pro-alert pro-alert-error">
          <AlertCircle size={18} /> <span>{pageError}</span>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      {!loading && (
        <main className="pro-main" style={{ opacity: isSuspended ? 0.4 : 1, pointerEvents: isSuspended ? 'none' : 'auto' }}>

          {/* Scan feedback toasts */}
          {reward && (
            <div className="pro-alert pro-alert-success">
              <Award size={18} />
              <div><strong>Palier atteint !</strong><p>{reward}</p></div>
              <button className="pro-alert-close" onClick={() => setReward(null)}><X size={16} /></button>
            </div>
          )}
          {lastScan && (
            <div className={`pro-alert ${lastScan.success ? 'pro-alert-success' : 'pro-alert-error'}`}>
              {lastScan.success ? (
                <div><strong>{lastScan.clientName}</strong><p>{lastScan.message}</p></div>
              ) : (
                <span>{lastScan.error}</span>
              )}
              <button className="pro-alert-close" onClick={() => setLastScan(null)}><X size={16} /></button>
            </div>
          )}

          {/* ===== DESKTOP TABS (hidden on mobile) ===== */}
          <div className="pro-tabs-desktop">
            {tabs.map(t => (
              <button key={t.id} className={`pro-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {/* ==================== SCANNER ==================== */}
          {activeTab === 'scanner' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <ScanLine size={22} />
                <div>
                  <h2>Scanner QR Code</h2>
                  <p>Scannez le QR code client pour {loyaltyType === 'points' ? 'ajouter des points' : 'valider un tampon'}</p>
                </div>
              </div>
              <div className="pro-scanner-area">
                {!scannerActive ? (
                  <button className="pro-scan-btn" onClick={() => setScannerActive(true)}>
                    <ScanLine size={28} />
                    <span>Appuyez pour scanner</span>
                  </button>
                ) : (
                  <>
                    <div id="qr-scanner" ref={scannerRef} className="pro-qr-reader"></div>
                    <button className="pro-btn-secondary" onClick={() => setScannerActive(false)}>
                      <X size={16} /> Arrêter le scanner
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ==================== CLIENTS ==================== */}
          {activeTab === 'clients' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <Users size={22} />
                <div>
                  <h2>Clients ({clients.length})</h2>
                  <p>Gérez vos clients et leurs {loyaltyType === 'points' ? 'points' : 'tampons'}</p>
                </div>
              </div>

              {/* Search */}
              <div className="pro-search-bar">
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                />
              </div>

              {/* Client Cards (mobile-friendly) */}
              {filteredClients.length === 0 ? (
                <div className="pro-empty">
                  <Users size={40} />
                  <p>{clientSearch ? 'Aucun résultat' : 'Aucun client pour le moment'}</p>
                </div>
              ) : (
                <div className="pro-client-list">
                  {filteredClients.map(client => (
                    <div className="pro-client-card" key={client.id}>
                      <div className="pro-client-info" onClick={() => setSelectedClientCard(client)}>
                        <div className="pro-client-avatar">{client.prenom?.[0] || '?'}</div>
                        <div className="pro-client-details">
                          <span className="pro-client-name">{client.prenom} {client.nom}</span>
                          <span className="pro-client-phone"><Phone size={12} /> {client.telephone}</span>
                        </div>
                        <div className="pro-client-points">
                          <span className="pro-points-value">
                            {loyaltyType === 'points'
                              ? client.points
                              : `${client.stamps_collected || 0}/${proInfo?.stamps_count || 10}`}
                          </span>
                          <span className="pro-points-label">{loyaltyType === 'points' ? 'pts' : 'tampons'}</span>
                        </div>
                      </div>
                      <div className="pro-client-actions">
                        <button className="pro-action-btn" onClick={() => adjustPoints(client.id, -1)} title="-1">
                          <Minus size={16} />
                        </button>
                        <button className="pro-action-btn pro-action-add" onClick={() => adjustPoints(client.id, 1)} title="+1">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== NOTIFICATIONS ==================== */}
          {activeTab === 'notifications' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <Bell size={22} />
                <div>
                  <h2>Notifications Push</h2>
                  <p>Envoyez des messages personnalisés à vos clients</p>
                </div>
              </div>

              <div className="pro-push-container">
                {/* Formulaire d'envoi */}
                <form className="pro-push-form" onSubmit={handleSendPush}>
                  <div className="pro-form-group">
                    <label>Sujet / Titre</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Promotion de Printemps !" 
                      value={pushTitle}
                      onChange={e => setPushTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="pro-form-group">
                    <label>Message</label>
                    <textarea 
                      placeholder="Votre message ici..." 
                      rows={4}
                      value={pushMessage}
                      onChange={e => setPushMessage(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="pro-push-selection">
                    <div className="pro-selection-header">
                      <h3>Sélectionner les clients ({selectedClients.length})</h3>
                      <button type="button" className="pro-btn-text" onClick={selectAllClients}>
                        {selectedClients.length === clients.filter(c => c.device_count > 0).length && selectedClients.length > 0 ? 'Tout désélectionner' : 'Sél. clients prêts'}
                      </button>
                    </div>
                    
                    <div className="pro-push-info-banner">
                      <AlertCircle size={14} />
                      <span>Seuls les clients ayant ajouté leur carte au Wallet (icône <Smartphone size={12} style={{verticalAlign:'middle'}}/>) peuvent recevoir des messages.</span>
                    </div>

                    <div className="pro-push-client-grid">
                      {clients.map(client => {
                        const isNotifiable = client.device_count > 0;
                        return (
                          <div 
                            key={client.id} 
                            className={`pro-push-client-item ${selectedClients.includes(client.id) ? 'selected' : ''} ${!isNotifiable ? 'disabled' : ''}`}
                            onClick={() => isNotifiable && toggleClientSelection(client.id)}
                            title={!isNotifiable ? "Ce client n'a pas encore installé sa carte Wallet" : ""}
                          >
                            <div className="pro-checkbox">
                              {selectedClients.includes(client.id) && <Check size={12} />}
                            </div>
                            <div className="pro-push-client-info-mini">
                              <span className="pro-push-client-name">{client.prenom} {client.nom}</span>
                              {isNotifiable && <Smartphone size={12} className="pro-notifiable-icon" title="Carte Wallet active" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button type="submit" className="pro-btn-primary" disabled={sendingPush || selectedClients.length === 0}>
                    {sendingPush ? <><Loader2 size={18} className="pro-spin" /> Envoi...</> : <><Send size={18} /> Envoyer la notification</>}
                  </button>
                </form>

                {/* Historique */}
                <div className="pro-push-history">
                  <div className="pro-history-header">
                    <History size={18} />
                    <h3>Historique des envois</h3>
                  </div>
                  <div className="pro-history-list">
                    {pushHistory.length === 0 ? (
                      <p className="pro-empty-small">Aucun historique pour le moment.</p>
                    ) : (
                      pushHistory.map(item => (
                        <div key={item.id} className="pro-history-item">
                          <div className="pro-history-main">
                            <h4>{item.title}</h4>
                            <p>{item.message}</p>
                          </div>
                          <div className="pro-history-meta">
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            <span className="pro-badge-small">{item.recipients_count} dest.</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== RECRUTER ==================== */}
          {activeTab === 'register' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <LinkIcon size={22} />
                <div>
                  <h2>Recruter des clients</h2>
                  <p>Partagez ce QR ou ce lien pour inscrire vos clients</p>
                </div>
              </div>
              <div className="pro-recruit-content">
                <div className="pro-qr-display">
                  {proInfo ? (
                    <QRCodeSVG value={`${window.location.origin}/join/${proInfo.id}`} size={200} level="H" includeMargin={true} />
                  ) : (
                    <div className="pro-qr-placeholder"><Loader2 size={24} className="pro-spin" /></div>
                  )}
                </div>
                <p className="pro-recruit-hint">Faites scanner ce QR à vos clients ou partagez le lien ci-dessous</p>
                <div className="pro-link-copy">
                  <input
                    type="text"
                    readOnly
                    value={proInfo ? `${window.location.origin}/join/${proInfo.id}` : ''}
                  />
                  <button className="pro-copy-btn" onClick={handleCopyLink}>
                    {copied ? <><Check size={16} /> Copié</> : <><Copy size={16} /> Copier</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== DESIGN ==================== */}
          {activeTab === 'design' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <Palette size={22} />
                <div>
                  <h2>Design de la carte</h2>
                  <p>Personnalisez l'apparence de votre carte Wallet</p>
                </div>
              </div>
              <CardCustomizer proInfo={proInfo} />
            </div>
          )}

          {/* ==================== RÉGLAGES ==================== */}
          {activeTab === 'settings' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <Settings size={22} />
                <div>
                  <h2>Paramètres de Fidélité</h2>
                  <p>Configurez les paliers et les récompenses</p>
                </div>
              </div>

              <div className="pro-settings-container">
                <form className="pro-settings-form" onSubmit={handleSaveLoyaltyConfig}>
                  <div className="pro-settings-card">
                    <h3>Type de programme</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <div className="pro-badge" style={{ 
                        background: 'var(--accent-light)', 
                        color: 'var(--accent)', 
                        padding: '6px 14px', 
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '700',
                        textTransform: 'capitalize'
                      }}>
                        {loyaltyConfig.loyalty_type === 'stamps' ? 'Tampons (Stamps)' : 'Points'}
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                        Contactez l'administrateur pour changer le type de programme.
                      </span>
                    </div>
                  </div>

                  <div className="pro-settings-card">
                    <h3>Fonctionnement</h3>
                    <div className="pro-form-row">
                      <div className="pro-form-group">
                        <label>{loyaltyConfig.loyalty_type === 'points' ? 'Points par passage' : 'Tampons par passage'}</label>
                        <input 
                          type="number" 
                          min="1"
                          value={loyaltyConfig.loyalty_type === 'points' ? loyaltyConfig.points_per_purchase : loyaltyConfig.stamps_per_purchase}
                          onChange={e => setLoyaltyConfig({
                            ...loyaltyConfig, 
                            [loyaltyConfig.loyalty_type === 'points' ? 'points_per_purchase' : 'stamps_per_purchase']: parseInt(e.target.value)
                          })}
                        />
                      </div>
                      <div className="pro-form-group">
                        <label>{loyaltyConfig.loyalty_type === 'points' ? 'Points pour un cadeau' : 'Seuil de récompense'}</label>
                        {loyaltyConfig.loyalty_type === 'points' ? (
                          <input 
                            type="number" 
                            min="1"
                            value={loyaltyConfig.points_for_reward || 10}
                            onChange={e => setLoyaltyConfig({
                              ...loyaltyConfig, 
                              points_for_reward: parseInt(e.target.value)
                            })}
                          />
                        ) : (
                          <div className="pro-read-only-box" style={{ 
                            padding: '12px 16px', 
                            background: 'var(--bg-subtle)', 
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '15px',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)'
                          }}>
                            10 tampons (Fixe)
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="pro-hint">Le client verra sa progression sur sa carte (ex: 15 / 20 points).</p>
                  </div>

                  <div className="pro-settings-card">
                    <h3>Récompense</h3>
                    <div className="pro-form-group">
                      <label>Nom du cadeau ou de l'offre</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Un café offert" 
                        value={loyaltyConfig.reward_title || ''}
                        onChange={e => setLoyaltyConfig({...loyaltyConfig, reward_title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="pro-form-group">
                      <label>Description (optionnel)</label>
                      <textarea 
                        placeholder="Détails de l'offre..." 
                        rows={2}
                        value={loyaltyConfig.reward_description || ''}
                        onChange={e => setLoyaltyConfig({...loyaltyConfig, reward_description: e.target.value})}
                      ></textarea>
                    </div>
                  </div>

                  <button type="submit" className="pro-btn-primary" disabled={savingSettings}>
                    {savingSettings ? <Loader2 size={18} className="pro-spin" /> : <Save size={18} />}
                    Enregistrer les paramètres
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="pro-bottom-nav">
        {tabs.map(t => (
          <button key={t.id} className={`pro-bnav-item ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <t.icon size={20} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ===== CLIENT DETAIL MODAL ===== */}
      {selectedClientCard && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }} onClick={() => setSelectedClientCard(null)}>
          <div className="pro-modal" onClick={e => e.stopPropagation()}>
            <button className="pro-modal-close" onClick={() => setSelectedClientCard(null)}><X size={20} /></button>
            <div className="pro-modal-avatar">{selectedClientCard.prenom?.[0] || '?'}</div>
            <h3>{selectedClientCard.prenom} {selectedClientCard.nom}</h3>
            <div className="pro-modal-info">
              <div className="pro-modal-row"><Phone size={14} /><span>{selectedClientCard.telephone}</span></div>
              <div className="pro-modal-row"><Award size={14} /><span>{loyaltyType === 'points' ? `${selectedClientCard.points} points` : `${selectedClientCard.stamps_collected || 0}/${proInfo?.stamps_count || 10} tampons`}</span></div>
            </div>
            <div className="pro-modal-actions">
              <button className="pro-action-btn" onClick={() => adjustPoints(selectedClientCard.id, -1)}><Minus size={16} /></button>
              <button className="pro-action-btn pro-action-add" onClick={() => adjustPoints(selectedClientCard.id, 1)}><Plus size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* ===== WALLET MODAL (SUPPRIMÉ) ===== */}
    </div>
  )
}

export default ProDashboard
