import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

import CardCustomizer from '../components/CardCustomizer'
import HistoryModal from '../components/HistoryModal'
import { LogOut, ScanLine, Users, Link as LinkIcon, Palette, Smartphone, X, Copy, Plus, Minus, AlertCircle, Loader2, Phone, Mail, Award, Check, Settings, Save, Trash2, Sun, Moon, Gift, Lock, ChevronRight, PlusCircle, History, Globe, RotateCw, Bell, MapPin, Navigation } from 'lucide-react'
import './ProDashboard.css'

function ProDashboard() {
  const [activeTab, setActiveTab] = useState('scanner')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === null ? true : saved === 'dark';
  })
  const [toasts, setToasts] = useState([])
  const [clients, setClients] = useState([])
  const [scannerActive, setScannerActive] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  
  const [proInfo, setProInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [customization, setCustomization] = useState(null)
  const [selectedClientCard, setSelectedClientCard] = useState(null)

  const [copied, setCopied] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  const [redeemModal, setRedeemModal] = useState(null); // { clientId, clientName, rewards }
  const [deleteModal, setDeleteModal] = useState(null); // { clientId, clientName }
  const [showHistory, setShowHistory] = useState(false)
  const [pointsToAdd, setPointsToAdd] = useState('');

  // Two-Step Transaction Flow
  const [activeTransaction, setActiveTransaction] = useState(null); // { clientId, clientName, currentPoints, allRewards, nextTier }
  const [scanStep, setScanStep] = useState(null); // null, 'reward', 'points'
  const [isProcessing, setIsProcessing] = useState(false);

  // Loyalty Settings
  const [loyaltyConfig, setLoyaltyConfig] = useState({
    points_adding_mode: 'automatic',
    points_per_purchase: 10,
    max_points_balance: null,
    points_shortcuts: [],
    reward_tiers: []
  })
  const [shortcutInput, setShortcutInput] = useState('')
  
  // Tiers Form
  const [newTier, setNewTier] = useState({ points_required: '', title: '' })
  
  const [savingSettings, setSavingSettings] = useState(false)
  const [proxConfig, setProxConfig] = useState({ relevant_text: '', locations: [] })
  const [proxSaving, setProxSaving] = useState(false)
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const scannerInstance = useRef(null)
  const qrRef = useRef(null)
  const { token, isSuspended, logout } = useAuth()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  useEffect(() => {
    if (!token) {
      navigate('/pro/login')
    } else {
      loadProInfo()
      loadClients()
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
      try {
        const customResp = await api.get(`/pro/card-customization/${response.data.id}?loyaltyType=points`)
        setCustomization(customResp.data)
      } catch (err) {
        console.log('Pas de personnalisation, utiliser valeurs par défaut')
      }
      setLoading(false)
    } catch (err) {
      setPageError('Erreur lors du chargement des informations')
      setLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const response = await api.get('/pro/clients')
      setClients(response.data)
    } catch (err) {
      setPageError('Erreur lors du chargement de la liste des clients')
    }
  }

  useEffect(() => {
    if (proInfo?.id) {
      const loadProxConfig = async () => {
        try {
          const { data } = await api.get(`/pro/card-customization/${proInfo.id}?loyaltyType=${proInfo.loyalty_type || 'points'}`)
          let parsedLocs = []
          try { parsedLocs = data.locations ? (typeof data.locations === 'string' ? JSON.parse(data.locations) : data.locations) : [] } catch (e) {}
          setProxConfig({ relevant_text: data.relevant_text || '', locations: parsedLocs })
        } catch (err) {}
      }
      loadProxConfig()
    }
  }, [proInfo])

  const loadLoyaltyConfig = async () => {
    try {
      const resp = await api.get('/pro/loyalty/config')
      setLoyaltyConfig({
        ...resp.data,
        reward_tiers: resp.data.reward_tiers || []
      })
    } catch (err) {
      console.error('Erreur chargement config loyauté:', err)
    }
  }

  const initScanner = async () => {
    if (!scannerRef.current) return;
    
    // Si une instance existe déjà, on ne fait rien
    if (scannerInstance.current) return;

    try {
      const html5QrCode = new Html5Qrcode('qr-scanner');
      scannerInstance.current = html5QrCode;

      const config = { 
        fps: 15, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      // Démarrage immédiat sur la caméra arrière
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          html5QrCode.stop().then(() => {
            scannerInstance.current = null;
            setScannerActive(false);
            processScan(decodedText);
          });
        },
        (errorMessage) => {
          // On ignore les erreurs de scan silencieuses
        }
      );
    } catch (err) {
      console.error("Erreur démarrage scanner:", err);
      setScannerActive(false);
      alert("Impossible d'accéder à la caméra arrière.");
    }
  }

  const destroyScanner = async () => {
    if (scannerInstance.current) {
      try {
        await scannerInstance.current.stop();
        scannerInstance.current = null;
      } catch (e) {
        console.warn("Erreur stop scanner:", e);
      }
    }
  }

  const processScan = async (clientId) => {
    try {
      setLoading(true);
      const response = await api.get(`/pro/scan-lookup/${clientId}`);
      setActiveTransaction({
        ...response.data,
        clientId
      });
      setScanStep('reward');
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors de la lecture du QR Code', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleRewardStepChoice = async (rewardToClaim = null) => {
    if (!activeTransaction) return;

    if (rewardToClaim) {
      try {
        setIsProcessing(true);
        const response = await api.post('/pro/redeem-reward', { 
          clientId: activeTransaction.clientId, 
          rewardTierId: rewardToClaim.id 
        });
        
        // Mettre à jour les points locaux pour l'étape suivante
        setActiveTransaction(prev => ({
          ...prev,
          currentPoints: prev.currentPoints - rewardToClaim.points_required
        }));
        
        addToast(`Cadeau "${rewardToClaim.title}" utilisé !`);
      } catch (err) {
        addToast(err.response?.data?.error || 'Erreur lors de l\'utilisation du cadeau', 'error');
        setIsProcessing(false);
        return; // On ne passe pas à la suite si erreur
      }
    }

    // Passage à l'étape points
    setPointsToAdd(loyaltyConfig.points_adding_mode === 'automatic' ? loyaltyConfig.points_per_purchase.toString() : '');
    setScanStep('points');
    setIsProcessing(false);
  }

  const handleFinalizePointsStep = async () => {
    if (!activeTransaction) return;
    
    try {
      setIsProcessing(true);
      const pts = Number(pointsToAdd) || 0;
      
      const response = await api.post('/pro/scan', {
        clientId: activeTransaction.clientId,
        points_to_add: pts
      });

      addToast(response.data.message || 'Points ajoutés !');
      
      setLastScan({
        success: true,
        clientName: activeTransaction.clientName,
        newPoints: response.data.newPoints,
        message: response.data.message
      });
      
      setScanStep(null);
      setActiveTransaction(null);
      loadClients();
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors de l\'ajout des points', 'error');
    } finally {
      setIsProcessing(false);
    }
  }

  const handleManualClientScan = async (clientId) => {
    try {
      setLoading(true);
      const response = await api.get(`/pro/scan-lookup/${clientId}`);
      setActiveTransaction({
        ...response.data,
        clientId
      });
      setScanStep('reward');
    } catch (err) {
      addToast(err.response?.data?.error || 'Impossible de charger les données du client', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleRedeem = async (rewardTierId) => {
    try {
      setLoading(true)
      const response = await api.post('/pro/redeem-reward', { 
        clientId: redeemModal.clientId, 
        rewardTierId 
      })
      
      // On ferme tout immédiatement (Règle : 1 cadeau max par passage)
      setRedeemModal(null)
      setLastScan(null)
      addToast('Cadeau validé avec succès !')
      loadClients()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors du rachat')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClient = (clientId, clientName) => {
    setDeleteModal({ clientId, clientName });
  }

  const handleConfirmDelete = async () => {
    const { clientId, clientName } = deleteModal;
    setDeleteModal(null);
    try {
      await api.delete(`/pro/clients/${clientId}`);
      setClients(prev => prev.filter(c => c.id !== clientId));
      addToast(`Le client ${clientName} a été supprimé.`, 'error');
    } catch (err) {
      console.error('Erreur suppression client:', err);
      setPageError(err.response?.data?.error || 'Erreur lors de la suppression du client');
    }
  }

  const adjustPoints = async (clientId, adjustment) => {
    try {
      await api.put(`/pro/adjust-points/${clientId}`, { adjustment })
      addToast(adjustment > 0 ? '+ points ajoutés' : '- points retirés')
      loadClients()
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur', 'error')
    }
  }

  const handleLogout = () => { logout(); navigate('/pro/login') }

  const handleExportCSV = () => {
    const headers = ['Prénom', 'Nom', 'Téléphone', 'Email', 'Points', 'Type Wallet', 'Optin Marketing']
    const rows = clients.map(c => [
      c.prenom || '',
      c.nom || '',
      c.telephone || '',
      c.email || '',
      c.points || 0,
      c.type_wallet || '',
      c.marketing_optin ? 'Oui' : 'Non'
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join('\t'))
      .join('\n')
    const BOM = new Uint8Array([0xFF, 0xFE])
    const view = new Uint16Array(csvContent.length)
    for (let i = 0; i < csvContent.length; i++) view[i] = csvContent.charCodeAt(i)
    const blob = new Blob([BOM, view], { type: 'text/csv;charset=utf-16le;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `clients-${proInfo?.nom?.toLowerCase().replace(/\s+/g, '-') || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleDownloadQR = () => {
    const svg = qrRef.current.querySelector('svg')
    const svgData = new XMLSerializer().serializeToString(svg)
    const padding = 40
    const qrSize = 400
    const size = qrSize + padding * 2
    const radius = 32
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(radius, 0)
    ctx.lineTo(size - radius, 0)
    ctx.quadraticCurveTo(size, 0, size, radius)
    ctx.lineTo(size, size - radius)
    ctx.quadraticCurveTo(size, size, size - radius, size)
    ctx.lineTo(radius, size)
    ctx.quadraticCurveTo(0, size, 0, size - radius)
    ctx.lineTo(0, radius)
    ctx.quadraticCurveTo(0, 0, radius, 0)
    ctx.closePath()
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.clip()
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, padding, padding, qrSize, qrSize)
      URL.revokeObjectURL(url)
      const a = document.createElement('a')
      a.download = `qrcode-${proInfo.nom.toLowerCase().replace(/\s+/g, '-')}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = url
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${proInfo.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleProxChange = (e) => {
    const { name, value } = e.target
    setProxConfig(prev => ({ ...prev, [name]: value }))
  }
  const handleProxLocationChange = (index, field, value) => {
    const updatedLocs = [...(proxConfig.locations || [])]
    let parsed = value
    if (field === 'latitude' || field === 'longitude') { parsed = value === '' ? '' : parseFloat(value); if (isNaN(parsed)) parsed = '' }
    updatedLocs[index] = { ...updatedLocs[index], [field]: parsed }
    setProxConfig(prev => ({ ...prev, locations: updatedLocs }))
  }
  const addProxLocation = () => {
    const current = proxConfig.locations || []
    if (current.length >= 10) return
    setProxConfig(prev => ({ ...prev, locations: [...current, { latitude: '', longitude: '', relevantText: '' }] }))
  }
  const removeProxLocation = (index) => {
    const updatedLocs = [...(proxConfig.locations || [])]
    updatedLocs.splice(index, 1)
    setProxConfig(prev => ({ ...prev, locations: updatedLocs }))
  }
  const handleSaveProx = async () => {
    if (!proInfo?.id) return
    setProxSaving(true)
    try {
      await api.put(`/pro/card-customization/${proInfo.id}?loyaltyType=${proInfo.loyalty_type || 'points'}`, proxConfig)
      addToast('GPS & Notifications enregistrés !')
    } catch (err) {
      addToast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setProxSaving(false)
    }
  }

  const handleSaveLoyaltyConfig = async (e) => {
    e.preventDefault()
    try {
      setSavingSettings(true)
      await api.put('/pro/loyalty/config', loyaltyConfig)
      addToast('Paramètres enregistrés !')
      loadLoyaltyConfig()
    } catch (err) {
      addToast(err.response?.data?.error || 'Erreur lors de la sauvegarde', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleAddTier = async () => {
    if (!newTier.points_required || !newTier.title) return
    try {
      setSavingSettings(true)
      await api.post('/pro/reward-tiers', newTier)
      setNewTier({ points_required: '', title: '' })
      loadLoyaltyConfig()
      addToast('Palier ajouté avec succès')
    } catch (err) {
      addToast(err.response?.data?.error || "Erreur lors de l'ajout", 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleDeleteTier = async (id) => {
    if (!window.confirm('Supprimer ce palier ?')) return
    try {
      setSavingSettings(true)
      await api.delete(`/pro/reward-tiers/${id}`)
      loadLoyaltyConfig()
      addToast('Palier supprimé')
    } catch (err) {
      addToast('Erreur lors de la suppression', 'error')
    } finally {
      setSavingSettings(false)
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
    { id: 'register', icon: LinkIcon, label: 'Recruter' },
    { id: 'design', icon: Palette, label: 'Design' },
    { id: 'settings', icon: Settings, label: 'Réglages' }
  ]

  return (
    <div className="pro-dash">
      {/* ===== TOP BAR ===== */}
      <header className="pro-topbar">
        <div className="pro-topbar-left" style={{ gap: '15px' }}>
          <img src="/logo-fidelyz.png" alt="Fidelyz Logo" style={{ height: '36px', objectFit: 'contain' }} />
          <div>
            <h1 className="pro-company-name">{proInfo?.nom || localStorage.getItem('companyName')}</h1>
            <span className="pro-badge">Points · {clients.length} client(s)</span>
          </div>
        </div>
        <div className="pro-topbar-right">
          <button className="pro-topbar-btn theme-toggle" onClick={() => setDarkMode(!darkMode)} title="Changer de thème">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="pro-topbar-btn logout-btn" onClick={handleLogout} title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ===== TOAST CONTAINER ===== */}
      <div className="pro-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`pro-toast ${t.type}`}>
            {t.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {isSuspended && (
        <div className="pro-suspended-banner">
          <AlertCircle size={20} />
          <div>
            <strong>Compte Suspendu</strong>
            <p>Contactez l'administrateur pour plus d'informations.</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="pro-loading">
          <Loader2 size={28} className="pro-spin" />
          <p>Chargement...</p>
        </div>
      )}

      {pageError && (
        <div className="pro-alert pro-alert-error">
          <AlertCircle size={18} /> <span>{pageError}</span>
        </div>
      )}

      {!loading && (
        <main className="pro-main" style={{ opacity: isSuspended ? 0.4 : 1, pointerEvents: isSuspended ? 'none' : 'auto' }}>

          {/* Flash Messages (Legacy, to keep) */}
          {lastScan && !lastScan.nextTier && !lastScan.availableRewards && (
            <div className={`pro-alert ${lastScan.success ? 'pro-alert-success' : 'pro-alert-error'}`}>
              {lastScan.success ? (
                <div><strong>{lastScan.clientName}</strong><p>{lastScan.message}</p></div>
              ) : (
                <span>{lastScan.error}</span>
              )}
              <button className="pro-alert-close" onClick={() => setLastScan(null)}><X size={16} /></button>
            </div>
          )}

          {/* Desktop Tabs */}
          <div className="pro-tabs-desktop">
            {tabs.map(t => (
              <button key={t.id} className={`pro-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {/* ====== SCANNER ====== */}
          {activeTab === 'scanner' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <ScanLine size={22} />
                <div>
                  <h2>Scanner QR Code</h2>
                  <p>Attribution de points</p>
                </div>
              </div>

              {!activeTransaction && (
                <div className="pro-scanner-area">
                  {!scannerActive ? (
                    <button className="pro-scan-btn-premium" onClick={() => setScannerActive(true)}>
                      <div className="scan-icon-container">
                         <ScanLine size={48} />
                         <div className="scan-pulse"></div>
                      </div>
                      <div className="scan-text">
                        <span>Lancer le scan</span>
                        <p>Visez le code QR du client</p>
                      </div>
                    </button>
                  ) : (
                    <div className="scanner-full-overlay">
                       <div className="scanner-header">
                          <button onClick={() => setScannerActive(false)} className="scanner-close">
                            <X size={24} />
                          </button>
                          <span>Scan en cours...</span>
                       </div>
                       <div className="scanner-view-container">
                          <div id="qr-scanner" ref={scannerRef} className="pro-qr-reader-premium"></div>
                          <div className="scanner-frame"></div>
                       </div>
                       <div className="scanner-footer">
                          Positionnez le QR code dans le cadre
                       </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ====== CLIENTS ====== */}
          {activeTab === 'clients' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <Users size={22} />
                <div>
                  <h2>Clients ({clients.length})</h2>
                  <p>Gérez vos clients et leur cagnotte</p>
                </div>
                {clients.length > 0 && (
                  <button className="pro-export-btn" onClick={handleExportCSV} title="Exporter en Excel">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Exporter
                  </button>
                )}
              </div>

              <div className="pro-search-bar">
                <div className="pro-search-wrapper">
                  <input
                    type="text"
                    placeholder="Rechercher un client..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                  />
                  {clientSearch && (
                    <button className="pro-search-clear" onClick={() => setClientSearch('')}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="pro-client-list">
                  {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton-card" />)}
                </div>
              ) : filteredClients.length === 0 ? (
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
                          <span className="pro-client-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {client.prenom} {client.nom}
                            {!client.marketing_optin && (
                              <span title="Ce client n'a pas consenti aux communications marketing" style={{
                                fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px',
                                background: 'rgba(239,68,68,0.15)', color: '#ef4444', lineHeight: '1.4',
                                whiteSpace: 'nowrap'
                              }}>
                                Opt-in refusé
                              </span>
                            )}
                          </span>
                          <span className="pro-client-phone"><Phone size={12} /> {client.telephone}</span>
                          {client.email && <span className="pro-client-email"><Mail size={12} /> {client.email}</span>}
                        </div>
                        <div className="pro-client-points">
                          <span className="pro-points-value">{client.points || 0}</span>
                          <span className="pro-points-label">pts</span>
                        </div>
                      </div>
                      <div className="pro-client-actions">
                        <button className="pro-action-btn" onClick={() => adjustPoints(client.id, -1)} title="-1"><Minus size={16} /></button>
                        <button className="pro-action-btn pro-action-add" onClick={() => adjustPoints(client.id, 1)} title="+1"><Plus size={16} /></button>
                        <button className="pro-action-btn pro-action-manual" onClick={(e) => { e.stopPropagation(); handleManualClientScan(client.id); }} title="Ajouter des points manuellement"><ScanLine size={16} /></button>
                        <button className="pro-action-btn pro-action-delete" onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id, `${client.prenom} ${client.nom}`); }} title="Supprimer client"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ====== RECRUTER ====== */}
          {activeTab === 'register' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <LinkIcon size={22} />
                <div>
                  <h2>Recruter des clients</h2>
                  <p>Partagez ce QR ou lien</p>
                </div>
              </div>
              <div className="pro-recruit-content">
                <div className="pro-qr-display" ref={qrRef}>
                  {proInfo ? (
                    <QRCodeSVG value={`${window.location.origin}/join/${proInfo.id}`} size={200} level="H" includeMargin={false} />
                  ) : (
                    <div className="pro-qr-placeholder"><Loader2 size={24} className="pro-spin" /></div>
                  )}
                </div>
                {proInfo && (
                  <button className="pro-qr-download-btn" onClick={handleDownloadQR}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Télécharger PNG
                  </button>
                )}
                <p className="pro-recruit-hint">Lien d'inscription client</p>
                <div className="pro-link-copy">
                  <input type="text" readOnly value={proInfo ? `${window.location.origin}/join/${proInfo.id}` : ''} />
                  <button className="pro-copy-btn" onClick={handleCopyLink}>
                    {copied ? <><Check size={16} /> Copié</> : <><Copy size={16} /> Copier</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ====== DESIGN ====== */}
          {activeTab === 'design' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <Palette size={22} />
                <div>
                  <h2>Design de la carte</h2>
                  <p>Wallet Customizer</p>
                </div>
              </div>
              <CardCustomizer proInfo={proInfo} />
            </div>
          )}

          {/* ====== RÉGLAGES ====== */}
          {activeTab === 'settings' && (
            <div className="pro-section">
              <div className="pro-section-header">
                <Settings size={22} />
                <div>
                  <h2>Paramètres</h2>
                  <p>Configuration de votre programme de fidélité</p>
                </div>
              </div>

              {/* ── GPS & Notifications ── */}
              <div className="gn-wrap">

                {/* En-tête section */}
                <div className="gn-section-head">
                  <div className="gn-section-icon"><Bell size={16} /></div>
                  <div>
                    <div className="gn-section-title">GPS &amp; Notifications Push</div>
                    <div className="gn-section-sub">Alertes de proximité et promotions en temps réel</div>
                  </div>
                </div>

                {/* Card : Notification Push */}
                <div className="gn-card">
                  <div className="gn-card-header">
                    <div className="gn-card-label"><Bell size={13} /> Notification Push</div>
                    <div className="gn-badges">
                      <span className="gn-badge gn-badge--apple">Apple — Push direct</span>
                      <span className="gn-badge gn-badge--google">Google — Mise à jour</span>
                    </div>
                  </div>

                  <div className="gn-field">
                    <label className="gn-label">Texte de la promotion</label>
                    <textarea
                      className="gn-textarea"
                      name="relevant_text"
                      value={proxConfig.relevant_text}
                      onChange={handleProxChange}
                      placeholder="Ex : -20% sur tout le magasin ce week-end !"
                      rows={3}
                      maxLength={100}
                    />
                    <div className="gn-char-count">{(proxConfig.relevant_text || '').length}/100</div>
                  </div>

                  {proxConfig.relevant_text && (
                    <div className="gn-preview">
                      <div className="gn-preview-label">Aperçu de la notification</div>
                      <div className="gn-preview-notif">
                        <div className="gn-preview-icon"><Bell size={12} /></div>
                        <div className="gn-preview-body">
                          <div className="gn-preview-app">Carte de fidélité</div>
                          <div className="gn-preview-text">{proxConfig.relevant_text}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="gn-platform-grid">
                    <div className="gn-platform-row">
                      <span className="gn-platform-icon">iOS</span>
                      <span className="gn-platform-text"><strong>Apple Wallet</strong> — notification push personnalisée sur l'écran verrouillé</span>
                    </div>
                    <div className="gn-platform-row">
                      <span className="gn-platform-icon">And.</span>
                      <span className="gn-platform-text"><strong>Google Wallet</strong> — notification de mise à jour générée par Android au changement de solde ou d'offre</span>
                    </div>
                  </div>
                </div>

                {/* Card : Géolocalisation */}
                <div className="gn-card">
                  <div className="gn-card-header">
                    <div className="gn-card-label"><MapPin size={13} /> Géolocalisation &amp; Proximité</div>
                    <div className="gn-card-header-right">
                      <span className="gn-loc-count">{(proxConfig.locations || []).length}/10</span>
                      <button
                        type="button"
                        className="gn-add-btn"
                        onClick={addProxLocation}
                        disabled={(proxConfig.locations || []).length >= 10}
                      >
                        <Plus size={13} /> Ajouter
                      </button>
                    </div>
                  </div>

                  <div className="gn-platform-grid">
                    <div className="gn-platform-row">
                      <span className="gn-platform-icon">iOS</span>
                      <span className="gn-platform-text"><strong>Apple Wallet</strong> — notification sur l'écran verrouillé à ~100 m du lieu</span>
                    </div>
                    <div className="gn-platform-row">
                      <span className="gn-platform-icon">And.</span>
                      <span className="gn-platform-text"><strong>Google Wallet</strong> — geofencing natif Android, notification de proximité sans app dédiée</span>
                    </div>
                  </div>

                  <div className="gn-locs">
                    {(proxConfig.locations || []).length === 0 ? (
                      <div className="gn-empty">
                        <Navigation size={28} />
                        <div>Aucun lieu configuré</div>
                        <div className="gn-empty-sub">Cliquez sur « Ajouter » pour configurer un lieu</div>
                      </div>
                    ) : (
                      (proxConfig.locations || []).map((loc, index) => (
                        <div key={index} className="gn-loc">
                          <div className="gn-loc-top">
                            <div className="gn-loc-badge">{index + 1}</div>
                            <div className="gn-loc-coords">
                              <div className="gn-loc-coord-field">
                                <label className="gn-label">Latitude</label>
                                <input
                                  className="gn-input"
                                  type="number" step="any"
                                  value={loc.latitude ?? ''}
                                  onChange={(e) => handleProxLocationChange(index, 'latitude', e.target.value)}
                                  placeholder="48.8566"
                                />
                              </div>
                              <div className="gn-loc-coord-field">
                                <label className="gn-label">Longitude</label>
                                <input
                                  className="gn-input"
                                  type="number" step="any"
                                  value={loc.longitude ?? ''}
                                  onChange={(e) => handleProxLocationChange(index, 'longitude', e.target.value)}
                                  placeholder="2.3522"
                                />
                              </div>
                            </div>
                            <button className="gn-del-btn" onClick={() => removeProxLocation(index)} title="Supprimer ce lieu">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="gn-loc-text-field">
                            <label className="gn-label">Message sur l'écran verrouillé</label>
                            <input
                              className="gn-input"
                              type="text"
                              value={loc.relevantText || ''}
                              onChange={(e) => handleProxLocationChange(index, 'relevantText', e.target.value)}
                              placeholder="Ex : Bienvenue ! N'oubliez pas votre carte."
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="gn-tip">
                    <Globe size={13} />
                    <span>Coordonnées disponibles sur <strong>Google Maps</strong> via clic droit → « Plus d'infos sur cet endroit ».</span>
                  </div>
                </div>

                {/* Bouton save */}
                <button type="button" className="gn-save-btn" onClick={handleSaveProx} disabled={proxSaving}>
                  {proxSaving ? <Loader2 size={15} className="pro-spin" /> : <Save size={15} />}
                  {proxSaving ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </button>

              </div>

              <div className="cfg-wrap">

                {/* ── Section 1 : Mode d'attribution ── */}
                <form onSubmit={handleSaveLoyaltyConfig} className="cfg-section">
                  <div className="cfg-section-label">
                    <Award size={13} /> Attribution des points
                  </div>

                  {/* Mode toggle */}
                  <div className="cfg-mode-toggle">
                    <button
                      type="button"
                      className={`cfg-mode-btn ${loyaltyConfig.points_adding_mode === 'automatic' ? 'cfg-mode-btn--on' : ''}`}
                      onClick={() => setLoyaltyConfig({...loyaltyConfig, points_adding_mode: 'automatic'})}
                    >
                      <span className="cfg-mode-title">Automatique</span>
                      <span className="cfg-mode-desc">Points fixes à chaque scan</span>
                    </button>
                    <button
                      type="button"
                      className={`cfg-mode-btn ${loyaltyConfig.points_adding_mode === 'manual' ? 'cfg-mode-btn--on' : ''}`}
                      onClick={() => setLoyaltyConfig({...loyaltyConfig, points_adding_mode: 'manual'})}
                    >
                      <span className="cfg-mode-title">Manuel</span>
                      <span className="cfg-mode-desc">Saisie libre à chaque scan</span>
                    </button>
                  </div>

                  {/* Points fixes (mode auto) */}
                  {loyaltyConfig.points_adding_mode === 'automatic' && (
                    <div className="cfg-field">
                      <label className="cfg-label">Points par passage</label>
                      <div className="cfg-input-row">
                        <input
                          className="cfg-input cfg-input-num"
                          type="number" min="1"
                          value={loyaltyConfig.points_per_purchase}
                          onChange={e => setLoyaltyConfig({...loyaltyConfig, points_per_purchase: parseInt(e.target.value)})}
                        />
                        <span className="cfg-unit">pts / scan</span>
                      </div>
                    </div>
                  )}

                  {/* Raccourcis (mode manuel) */}
                  {loyaltyConfig.points_adding_mode === 'manual' && (
                    <div className="cfg-field">
                      <label className="cfg-label">Raccourcis de points <span className="cfg-label-hint">— boutons rapides au scan</span></label>
                      <div className="cfg-chips">
                        {(loyaltyConfig.points_shortcuts?.length > 0
                          ? loyaltyConfig.points_shortcuts
                          : []
                        ).map((v, i) => (
                          <span key={i} className="cfg-chip">
                            +{v}
                            <button type="button" className="cfg-chip-x"
                              onClick={() => setLoyaltyConfig(prev => ({ ...prev, points_shortcuts: prev.points_shortcuts.filter((_, j) => j !== i) }))}>
                              ×
                            </button>
                          </span>
                        ))}
                        {!loyaltyConfig.points_shortcuts?.length && (
                          <span className="cfg-chips-default">Par défaut : +5, +10, +20, +50</span>
                        )}
                      </div>
                      <div className="cfg-input-row">
                        <input
                          className="cfg-input cfg-input-num"
                          type="number" min="1" placeholder="25"
                          value={shortcutInput}
                          onChange={e => setShortcutInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const v = parseInt(shortcutInput);
                              if (v > 0 && !(loyaltyConfig.points_shortcuts || []).includes(v)) {
                                setLoyaltyConfig(prev => ({ ...prev, points_shortcuts: [...(prev.points_shortcuts || []), v].sort((a,b) => a-b) }));
                                setShortcutInput('');
                              }
                            }
                          }}
                        />
                        <button type="button" className="cfg-btn-add"
                          onClick={() => {
                            const v = parseInt(shortcutInput);
                            if (v > 0 && !(loyaltyConfig.points_shortcuts || []).includes(v)) {
                              setLoyaltyConfig(prev => ({ ...prev, points_shortcuts: [...(prev.points_shortcuts || []), v].sort((a,b) => a-b) }));
                              setShortcutInput('');
                            }
                          }}>
                          <Plus size={14} /> Ajouter
                        </button>
                        {loyaltyConfig.points_shortcuts?.length > 0 && (
                          <button type="button" className="cfg-btn-ghost"
                            onClick={() => setLoyaltyConfig(prev => ({ ...prev, points_shortcuts: [] }))}>
                            Réinitialiser
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Solde max */}
                  <div className="cfg-field cfg-field--sep">
                    <div className="cfg-field-header">
                      <label className="cfg-label">Solde maximum par client</label>
                      {loyaltyConfig.max_points_balance
                        ? <span className="cfg-pill cfg-pill--blue">{loyaltyConfig.max_points_balance} pts max</span>
                        : <span className="cfg-pill cfg-pill--gray">Illimité</span>
                      }
                    </div>
                    <div className="cfg-input-row">
                      <input
                        className="cfg-input cfg-input-num"
                        type="number" min="1" placeholder="500"
                        value={loyaltyConfig.max_points_balance ?? ''}
                        onChange={e => setLoyaltyConfig({
                          ...loyaltyConfig,
                          max_points_balance: e.target.value === '' ? null : Math.max(1, parseInt(e.target.value) || 1)
                        })}
                      />
                      <span className="cfg-unit">pts</span>
                      {loyaltyConfig.max_points_balance != null && (
                        <button type="button" className="cfg-btn-ghost"
                          onClick={() => setLoyaltyConfig({ ...loyaltyConfig, max_points_balance: null })}>
                          Désactiver
                        </button>
                      )}
                    </div>
                    <p className="cfg-hint">Laissez vide pour aucune limite.</p>
                  </div>

                  <button type="submit" className="cfg-save-btn" disabled={savingSettings}>
                    {savingSettings ? <Loader2 size={14} className="pro-spin" /> : <Save size={14} />}
                    Enregistrer
                  </button>
                </form>

                {/* ── Section 2 : Paliers ── */}
                <div className="cfg-section">
                  <div className="cfg-section-label">
                    <Gift size={13} /> Paliers de récompenses
                  </div>

                  {loyaltyConfig.reward_tiers.length === 0 ? (
                    <div className="cfg-empty">
                      <Gift size={20} />
                      <span>Aucun palier défini</span>
                    </div>
                  ) : (
                    <div className="cfg-tiers">
                      {loyaltyConfig.reward_tiers.map(tier => (
                        <div key={tier.id} className="cfg-tier-row">
                          <div className="cfg-tier-pts">{tier.points_required}<span>pts</span></div>
                          <span className="cfg-tier-title">{tier.title}</span>
                          <button className="cfg-tier-del" onClick={() => handleDeleteTier(tier.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="cfg-tier-add">
                    <input className="cfg-input cfg-input-num" type="number" placeholder="pts" value={newTier.points_required} onChange={e => setNewTier({...newTier, points_required: e.target.value})} />
                    <input className="cfg-input cfg-input-flex" type="text" placeholder="Nom de l'offre (ex : Café offert)" value={newTier.title} onChange={e => setNewTier({...newTier, title: e.target.value})} />
                    <button className="cfg-btn-add" onClick={handleAddTier} disabled={savingSettings}>
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>
                </div>

                {/* ── Section 3 : Historique ── */}
                <button className="hist-open-btn" onClick={() => setShowHistory(true)}>
                  <div className="hist-open-btn-icon"><History size={18} /></div>
                  <div className="hist-open-btn-text">
                    <strong>Historique des points &amp; cadeaux</strong>
                    <span>Points ajoutés, cadeaux utilisés, retraits</span>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                </button>

              </div>
            </div>
          )}
        </main>
      )}

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}

      {/* Mobile NavBar */}
      <nav className="pro-bottom-nav">
        {tabs.map(t => (
          <button key={t.id} className={`pro-bnav-item ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <t.icon size={20} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Modal Client (Ajustement) */}
      {selectedClientCard && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }} onClick={() => setSelectedClientCard(null)}>
          <div className="pro-modal" onClick={e => e.stopPropagation()}>
            <button className="pro-modal-close" onClick={() => setSelectedClientCard(null)}><X size={20} /></button>
            <div className="pro-modal-avatar">{selectedClientCard.prenom?.[0] || '?'}</div>
            <h3>{selectedClientCard.prenom} {selectedClientCard.nom}</h3>
            <div className="pro-modal-info">
              <div className="pro-modal-row"><Phone size={14} /><span>{selectedClientCard.telephone}</span></div>
              <div className="pro-modal-row"><Award size={14} /><span>{selectedClientCard.points || 0} pts</span></div>
            </div>
            <div className="pro-modal-actions">
              <button className="pro-action-btn" onClick={() => adjustPoints(selectedClientCard.id, -1)}><Minus size={16} /></button>
              <button className="pro-action-btn pro-action-add" onClick={() => adjustPoints(selectedClientCard.id, 1)}><Plus size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression Client */}
      {deleteModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setDeleteModal(null)}>
          <div className="pro-modal delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-confirm-icon"><Trash2 size={28} /></div>
            <h3>Supprimer le client</h3>
            <p className="delete-confirm-text">
              Êtes-vous sûr de vouloir supprimer <strong>{deleteModal.clientName}</strong> ?<br />
              Sa carte de fidélité et son historique seront définitivement supprimés.
            </p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-cancel" onClick={() => setDeleteModal(null)}>Annuler</button>
              <button className="delete-confirm-ok" onClick={handleConfirmDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ÉTAPE 1 : CHOIX DU CADEAU ===== */}
      {scanStep === 'reward' && activeTransaction && (
        <div className="scan-action-modal centered-modal">
           <div className="pro-modal-box-premium floating-card">
              <div className="modal-header-mini">
                <Award size={24} className="icon-accent" />
                <div className="client-info-mini">
                   <h3>{activeTransaction.clientName}</h3>
                   <span>{activeTransaction.currentPoints} pts disponibles</span>
                </div>
                <button className="close-btn-mini" onClick={() => { setScanStep(null); setActiveTransaction(null); }}><X size={18} /></button>
              </div>

              <div className="modal-content-scrollable">
                 <p className="step-instruction">Choisir un cadeau à déduire maintenant :</p>
                 <div className="rewards-selection-grid">
                    {activeTransaction.allRewards.length === 0 ? (
                       <div className="empty-rewards">Aucun cadeau configuré</div>
                    ) : (
                       activeTransaction.allRewards.map(reward => {
                          const canAfford = activeTransaction.currentPoints >= reward.points_required;
                          return (
                            <button
                              key={reward.id}
                              className={`reward-tile ${!canAfford ? 'locked' : ''}`}
                              disabled={!canAfford || isProcessing}
                              onClick={() => handleRewardStepChoice(reward)}
                            >
                               <div className="reward-tile-icon">
                                  {canAfford ? <Gift size={18} /> : <Lock size={16} />}
                               </div>
                               <div className="reward-tile-text">
                                  <strong>{reward.title}</strong>
                                  <span>{reward.points_required} pts</span>
                               </div>
                            </button>
                          );
                       })
                    )}
                 </div>
              </div>

              <div className="modal-footer-sticky">
                 <button className="pro-btn-skip" onClick={() => handleRewardStepChoice(null)} disabled={isProcessing}>
                    Pas de cadeau / Continuer <ChevronRight size={18} />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ===== ÉTAPE 2 : ATTRIBUTION DES POINTS ===== */}
      {scanStep === 'points' && activeTransaction && (
        <div className="scan-action-modal centered-modal">
           <div className="pro-modal-box-premium floating-card points-card">
              <div className="modal-header-mini">
                <PlusCircle size={24} className="icon-success" />
                <div className="client-info-mini">
                   <h3>{activeTransaction.clientName}</h3>
                   <span>Nouveau solde : <strong>{activeTransaction.currentPoints} pts</strong></span>
                </div>
                <button className="close-btn-mini" onClick={() => { setScanStep(null); setActiveTransaction(null); }}><X size={18} /></button>
              </div>

              <div className="modal-content-centered">
                 {loyaltyConfig.points_adding_mode === 'automatic' ? (
                    <div className="auto-points-view">
                       <div className="points-pills large">+{loyaltyConfig.points_per_purchase}</div>
                       <p>Points automatiques pour le passage de ce jour.</p>
                    </div>
                 ) : (
                    <div className="manual-points-view">
                       <p className="step-instruction">Attribuer les points du jour :</p>
                       <div className="points-input-container">
                          <input
                            type="number"
                            autoFocus
                            className="points-entry"
                            placeholder="Montant..."
                            value={pointsToAdd}
                            onChange={(e) => setPointsToAdd(e.target.value)}
                          />
                          <span className="entry-unit">pts</span>
                       </div>
                       <div className="entry-shortcuts">
                          {(loyaltyConfig.points_shortcuts?.length > 0 ? loyaltyConfig.points_shortcuts : [5, 10, 20, 50]).map(v => (
                            <button key={v} onClick={() => setPointsToAdd(v.toString())}>+{v}</button>
                          ))}
                       </div>
                    </div>
                 )}
              </div>

              <div className="modal-footer-sticky">
                 <button
                   className="pro-btn-primary-premium full-width"
                   onClick={handleFinalizePointsStep}
                   disabled={isProcessing}
                 >
                    {isProcessing ? <Loader2 className="pro-spin" size={20} /> : 'Finaliser la transaction'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}

export default ProDashboard
