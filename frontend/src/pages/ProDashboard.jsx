import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

import CardCustomizer from '../components/CardCustomizer'
import { LogOut, ScanLine, Users, Link as LinkIcon, Palette, Smartphone, X, Copy, Plus, Minus, AlertCircle, Loader2, Phone, Mail, Award, Check, Settings, Save, Trash2 } from 'lucide-react'
import './ProDashboard.css'

function ProDashboard() {
  const [activeTab, setActiveTab] = useState('scanner')
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

  // Scanner extra flows
  const [inputModal, setInputModal] = useState(null); // { clientId }
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [redeemModal, setRedeemModal] = useState(null); // { clientId, clientName, rewards }

  // Loyalty Settings
  const [loyaltyConfig, setLoyaltyConfig] = useState({
    points_adding_mode: 'auto',
    points_per_purchase: 10,
    reward_tiers: []
  })
  
  // Tiers Form
  const [newTier, setNewTier] = useState({ points_required: '', title: '' })
  
  const [savingSettings, setSavingSettings] = useState(false)
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const scannerInstance = useRef(null)
  const { token, isSuspended, logout } = useAuth()

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

  const processScan = (clientId) => {
    if (loyaltyConfig.points_adding_mode === 'manual') {
      setInputModal({ clientId })
    } else {
      handleScanSubmit(clientId, loyaltyConfig.points_per_purchase)
    }
  }

  const handleScanSubmit = async (clientId, points) => {
    try {
      setLoading(true)
      setInputModal(null)
      setPointsToAdd('')
      
      const payload = { clientId }
      if (points !== undefined && points !== null) {
        payload.points_to_add = points
      }

      const response = await api.post('/pro/scan', payload)
      
      const successData = {
        success: true,
        clientName: response.data.clientName,
        message: response.data.message
      }
      
      setLastScan(successData)
      setTimeout(() => setLastScan(null), 5000)
      loadClients()

      if (response.data.allRewards && response.data.allRewards.length > 0) {
        setRedeemModal({
          clientId,
          clientName: response.data.clientName,
          rewards: response.data.allRewards,
          currentPoints: response.data.newPoints
        })
      }
    } catch (err) {
      setLastScan({ success: false, error: err.response?.data?.error || 'Erreur scan' })
      setTimeout(() => setLastScan(null), 4000)
    } finally {
      setLoading(false)
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
      setTimeout(() => setLastScan(null), 3000)
      loadClients()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors du rachat')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClient = async (clientId, clientName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le client ${clientName} ? Cette action supprimera également sa carte de fidélité et son historique.`)) {
      return;
    }

    try {
      await api.delete(`/pro/clients/${clientId}`);
      // Mettre à jour la liste locale
      setClients(prev => prev.filter(c => c.id !== clientId));
      setLastScan({ success: true, message: `Le client ${clientName} a été supprimé.` });
    } catch (err) {
      console.error('Erreur suppression client:', err);
      setPageError(err.response?.data?.error || 'Erreur lors de la suppression du client');
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

  const handleSaveLoyaltyConfig = async (e) => {
    e.preventDefault()
    try {
      setSavingSettings(true)
      await api.put('/pro/loyalty/config', loyaltyConfig)
      alert('Paramètres enregistrés !')
      loadLoyaltyConfig()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la sauvegarde')
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
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors de l'ajout")
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
    } catch (err) {
      alert('Erreur lors de la suppression')
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
        <div className="pro-topbar-left">
          <div className="pro-avatar">{(localStorage.getItem('companyName') || 'E')[0]}</div>
          <div>
            <h1 className="pro-company-name">{localStorage.getItem('companyName')}</h1>
            <span className="pro-badge">Points · {clients.length} client(s)</span>
          </div>
        </div>
        <button className="pro-topbar-btn" onClick={handleLogout} title="Déconnexion">
          <LogOut size={18} />
        </button>
      </header>

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

              {!inputModal && !redeemModal && !lastScan?.nextTier && (
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

              {/* Modal de saisie manuelle PREMIUM */}
              {inputModal && !redeemModal && (
                <div className="scan-action-modal">
                   <div className="pro-modal-box-premium">
                      <div className="modal-header">
                        <Users size={24} />
                        <h3>Ajouter des points</h3>
                      </div>
                      
                      <div className="points-input-section">
                        <div className="points-current-val">{pointsToAdd || '0'}</div>
                        <div className="points-shortcuts">
                          {[5, 10, 20, 50].map(val => (
                            <button key={val} type="button" onClick={() => setPointsToAdd(val.toString())}>+{val}</button>
                          ))}
                        </div>
                        <input 
                          type="number" 
                          autoFocus
                          value={pointsToAdd} 
                          onChange={(e) => setPointsToAdd(e.target.value)} 
                          placeholder="Ou saisissez ici..."
                          className="manual-points-input"
                        />
                      </div>

                      <div className="modal-footer-actions">
                        <button className="pro-btn-secondary-premium" onClick={() => setInputModal(null)}>Annuler</button>
                        <button className="pro-btn-primary-premium" onClick={() => handleScanSubmit(inputModal.clientId, pointsToAdd)}>
                          Confirmer <Check size={18} />
                        </button>
                      </div>
                   </div>
                </div>
              )}

              {/* Écran de succès et progression Reward */}
              {lastScan?.success && (lastScan.nextTier || lastScan.availableRewards) && (
                <div className="scan-action-modal">
                   <div className="pro-modal-box-premium success-view">
                      <div className="success-check-anim">
                        <div className="circle-check">
                          <Check size={40} />
                        </div>
                      </div>

                      <h2 className="success-title">Points Ajoutés !</h2>
                      <p className="success-subtitle"><strong>{lastScan.clientName}</strong> dispose maintenant de <strong>{lastScan.newPoints} pts</strong></p>

                      {/* Barre de progression vers le prochain palier */}
                      {lastScan.nextTier && (
                        <div className="reward-progress-card">
                           <div className="progress-info">
                              <span>Prochain cadeau : <strong>{lastScan.nextTier.title}</strong></span>
                              <span className="pts-remaining">Encore <strong>{lastScan.nextTier.points_required - lastScan.newPoints}</strong> pts</span>
                           </div>
                           <div className="progress-bar-bg">
                              <div 
                                className="progress-bar-fill" 
                                style={{ width: `${Math.min(100, (lastScan.newPoints / lastScan.nextTier.points_required) * 100)}%` }}
                              ></div>
                           </div>
                        </div>
                      )}

                      {/* Bouton pour voir les récompenses si dispo */}
                      {(lastScan.availableRewards?.length > 0) ? (
                        <div className="unlocked-section">
                           <div className="unlocked-header">
                              <Award size={18} />
                              <span>{lastScan.availableRewards.length} Cadeau(x) prêt(s)</span>
                           </div>
                           <button className="pro-btn-reward-claim" onClick={() => {
                              setRedeemModal({
                                clientId: lastScan.clientId,
                                clientName: lastScan.clientName,
                                rewards: lastScan.availableRewards
                              });
                           }}>
                             Utiliser un cadeau maintenant
                           </button>
                        </div>
                      ) : (
                        <button className="pro-btn-finish" onClick={() => setLastScan(null)}>
                          Terminer
                        </button>
                      )}
                      
                      {!lastScan.availableRewards?.length && (
                        <button className="close-final-btn" onClick={() => setLastScan(null)}><X size={20} /></button>
                      )}
                   </div>
                </div>
              )}

              {/* Modal de sélection cadeau PREMIUM */}
              {redeemModal && (
                <div className="scan-action-modal">
                   <div className="pro-modal-box-premium reward-selection">
                      <div className="modal-header">
                        <Award size={24} color="var(--accent)" />
                        <h3>Choisir un cadeau</h3>
                      </div>
                      
                      <div className="reward-scroll-list">
                        {redeemModal.rewards.map(r => {
                          const isLocked = redeemModal.currentPoints < r.points_required;
                          return (
                            <div key={r.id} className={`reward-item-premium ${isLocked ? 'locked' : ''}`}>
                               <div className="reward-item-info">
                                  <strong>{r.title}</strong>
                                  <span>{isLocked ? `Manque ${r.points_required - redeemModal.currentPoints} pts` : `Coût : ${r.points_required} pts`}</span>
                               </div>
                               <button 
                                 className="claim-item-btn" 
                                 disabled={isLocked}
                                 onClick={() => handleRedeem(r.id)}
                               >
                                 {isLocked ? <Settings size={14} /> : 'Valider'}
                               </button>
                            </div>
                          );
                        })}
                      </div>

                      <button 
                        className="pro-btn-secondary-premium" 
                        style={{ width: '100%', marginTop: '15px' }} 
                        onClick={() => { setRedeemModal(null); setLastScan(null); }}
                      >
                         Plus tard
                      </button>
                   </div>
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
              </div>

              <div className="pro-search-bar">
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                />
              </div>

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
                        <button className="pro-action-btn pro-action-delete" onClick={() => handleDeleteClient(client.id, `${client.prenom} ${client.nom}`)} title="Supprimer client"><Trash2 size={16} /></button>
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
                <div className="pro-qr-display">
                  {proInfo ? (
                    <QRCodeSVG value={`${window.location.origin}/join/${proInfo.id}`} size={200} level="H" includeMargin={true} />
                  ) : (
                    <div className="pro-qr-placeholder"><Loader2 size={24} className="pro-spin" /></div>
                  )}
                </div>
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
                  <p>Configuration de votre programme Fidélité</p>
                </div>
              </div>

              <div className="pro-settings-container">
                <form className="pro-settings-form" onSubmit={handleSaveLoyaltyConfig}>
                  <div className="pro-settings-card">
                    <h3>Mode d'attribution</h3>
                    <div className="pro-form-row">
                      <div className="pro-form-group">
                        <label>Mode au Scan</label>
                        <select 
                          value={loyaltyConfig.points_adding_mode} 
                          onChange={(e) => setLoyaltyConfig({...loyaltyConfig, points_adding_mode: e.target.value})}
                          style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                        >
                          <option value="auto">Automatique (Points Fixes)</option>
                          <option value="manual">Manuel (Saisie à chaque scan)</option>
                        </select>
                      </div>
                      
                      {loyaltyConfig.points_adding_mode === 'auto' && (
                        <div className="pro-form-group">
                          <label>Points fixes par passage</label>
                          <input 
                            type="number" 
                            min="1"
                            value={loyaltyConfig.points_per_purchase}
                            onChange={e => setLoyaltyConfig({...loyaltyConfig, points_per_purchase: parseInt(e.target.value)})}
                          />
                        </div>
                      )}
                    </div>
                    <button type="submit" className="pro-btn-primary" style={{ marginTop: '15px' }} disabled={savingSettings}>
                      {savingSettings ? <Loader2 size={16} className="pro-spin" /> : <Save size={16} />} Enregistrer Mode
                    </button>
                  </div>
                </form>

                <div className="pro-settings-card" style={{ marginTop: '20px' }}>
                  <h3>Paliers de Récompenses</h3>
                  <p className="pro-hint">Définissez des seuils de points et les cadeaux associés. Vos clients pourront les débloquer une fois le score atteint.</p>
                  
                  <div className="tiers-list" style={{ marginTop: '15px' }}>
                    {loyaltyConfig.reward_tiers.map(tier => (
                      <div key={tier.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', marginBottom: '8px', border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <strong style={{ background: 'var(--accent)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '13px' }}>{tier.points_required} pts</strong>
                          <span>{tier.title}</span>
                        </div>
                        <button onClick={() => handleDeleteTier(tier.id)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Trash2 size={18} /></button>
                      </div>
                    ))}
                    {loyaltyConfig.reward_tiers.length === 0 && (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                        Aucun palier défini
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Points requis</label>
                      <input type="number" placeholder="ex: 50" value={newTier.points_required} onChange={e => setNewTier({...newTier, points_required: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', width: '100%', boxSizing: 'border-box' }}/>
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Nom de l'offre</label>
                      <input type="text" placeholder="ex: Café offert" value={newTier.title} onChange={e => setNewTier({...newTier, title: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', width: '100%', boxSizing: 'border-box' }}/>
                    </div>
                    <button className="pro-btn-secondary" onClick={handleAddTier} disabled={savingSettings}>
                      <Plus size={18} /> Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

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
    </div>
  )
}

export default ProDashboard
