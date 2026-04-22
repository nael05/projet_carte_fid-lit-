import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import {
  AlertCircle, CheckCircle2, Loader2, X, Plus, Search,
  Lock, Unlock, Trash2, Key, Star, Stamp, LogOut,
  ShieldAlert, LayoutDashboard, Copy, ExternalLink, Users,
  Sun, Moon, PieChart, PlusCircle, Filter, Edit2, TrendingUp, Activity, Building2, Store, AlertTriangle,
  FileText, Save
} from 'lucide-react'
import './AdminDashboard.css'

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  const [enterprises, setEnterprises] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [newCompanyCredentials, setNewCompanyCredentials] = useState(null)
  const [editingCompany, setEditingCompany] = useState(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null)
  
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    prenom: '',
    telephone: '',
    loyalty_type: 'points'
  })

  const [legalContent, setLegalContent] = useState('')
  const [legalSaving, setLegalSaving] = useState(false)

  const navigate = useNavigate()
  const { logout, token } = useAuth()

  const copyToClipboard = (text, message = 'Copié !') => {
    navigator.clipboard.writeText(text)
    setSuccess(message)
    setTimeout(() => setSuccess(''), 2000)
  }

  const copyAllInfo = (ent) => {
    const text = `
DÉTAILS COMMERCE FIDELYZ
-----------------------
COMMERCE : ${ent.nom}
ID : #${ent.id}
GÉRANT : ${ent.prenom || 'N/A'}
TEL : ${ent.telephone || 'N/A'}
EMAIL : ${ent.email}
PASS TEMP : ${ent.temporary_password || 'Déjà changé'}
-----------------------`.trim()
    copyToClipboard(text, 'Toutes les infos ont été copiées !')
  }

  // Theme synchronization
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  useEffect(() => {
    if (!token) {
      navigate('/master-admin-secret')
      return
    }
    loadEnterprises()
    loadLegalContent()
  }, [token])

  const loadLegalContent = async () => {
    try {
      const res = await api.get('/settings/mentions-legales')
      setLegalContent(res.data.content || '')
    } catch {
      // silently ignore — table might not exist yet
    }
  }

  const saveLegalContent = async () => {
    setLegalSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.put('/admin/settings/mentions-legales', { content: legalContent })
      setSuccess('Mentions légales mises à jour avec succès.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde.')
    } finally {
      setLegalSaving(false)
    }
  }

  const loadEnterprises = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/admin/enterprises')
      let data = response.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = data.value || []
      }
      const enterprisesData = Array.isArray(data) ? data : []
      setEnterprises(enterprisesData)
    } catch (err) {
      console.error('Error loading enterprises:', err)
      setError('Erreur lors du chargement des entreprises')
      if (err.response?.status === 401) {
        logout()
        navigate('/master-admin-secret')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCompany = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!formData.nom || !formData.email) {
      setError('Tous les champs sont requis')
      return
    }
    
    setSubmitting(true)
    try {
      const response = await api.post('/admin/create-company', {
        nom: formData.nom,
        email: formData.email,
        prenom: formData.prenom,
        telephone: formData.telephone,
        loyalty_type: formData.loyalty_type
      })
      
      setNewCompanyCredentials({
        ...response.data,
        nom: formData.nom
      })

      setSuccess('Entreprise créée avec succès!')
      setFormData({ nom: '', email: '', prenom: '', telephone: '', loyalty_type: 'points' })
      
      setTimeout(() => {
        loadEnterprises()
        setSuccess('')
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSuspend = async (companyId) => {
    if (!window.confirm('Suspendre cette entreprise?')) return
    try {
      await api.put(`/admin/suspend-company/${companyId}`)
      setSuccess('Entreprise suspendue')
      loadEnterprises()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    }
  }

  const handleReactivate = async (companyId) => {
    if (!window.confirm('Réactiver cette entreprise?')) return
    try {
      await api.put(`/admin/reactivate-company/${companyId}`)
      setSuccess('Entreprise réactivée')
      loadEnterprises()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal) return
    try {
      await api.delete(`/admin/delete-company/${deleteConfirmModal.id}`)
      setSuccess('Entreprise supprimée définitivement')
      setDeleteConfirmModal(null)
      loadEnterprises()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression')
      setDeleteConfirmModal(null)
    }
  }

  const handleUpdateCompany = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('');
    setSubmitting(true)
    try {
      await api.put(`/admin/update-company/${editingCompany.id}`, editingCompany)
      setSuccess('Commerce mis à jour avec succès !')
      setEditingCompany(null)
      loadEnterprises()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de mise à jour')
    } finally {
      setSubmitting(false)
    }
  }

  const stats = {
    total: enterprises.length,
    active: enterprises.filter(e => e.statut === 'actif').length,
    suspended: enterprises.filter(e => e.statut === 'suspendu').length
  }

  const filteredEnterprises = enterprises.filter(ent => {
    const searchLower = searchTerm.toLowerCase().trim()
    const matchesSearch = !searchLower || (ent.nom || '').toLowerCase().includes(searchLower) || (ent.email || '').toLowerCase().includes(searchLower) || String(ent.id).includes(searchLower)
    const matchesFilter = filterStatus === 'tous' || ent.statut === filterStatus
    return matchesSearch && matchesFilter
  })

  return (
    <div className={`admin-ux-v3 ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <div className="ux-bg-glass"></div>
      
      {/* MODAL CREDENTIALS */}
      {newCompanyCredentials && (
        <div className="ux-modal-overlay" onClick={() => setNewCompanyCredentials(null)}>
          <div className="ux-modal-card" onClick={e => e.stopPropagation()}>
            <div className="ux-modal-header">
              <div className="ux-icon-success"><CheckCircle2 size={32} /></div>
              <h2>Commerce Créé !</h2>
              <p>Voici les accès pour <strong>{newCompanyCredentials.nom}</strong></p>
            </div>
            
            <div className="ux-cred-box">
              <div className="ux-cred-row">
                <label>Email Identifiant</label>
                <div className="ux-copy-group">
                  <code>{newCompanyCredentials.email}</code>
                  <button onClick={() => navigator.clipboard.writeText(newCompanyCredentials.email)}><Copy size={16} /></button>
                </div>
              </div>
              <div className="ux-cred-row">
                <label>Mot de passe temporaire</label>
                <div className="ux-copy-group">
                  <code>{newCompanyCredentials.temporaryPassword}</code>
                  <button onClick={() => navigator.clipboard.writeText(newCompanyCredentials.temporaryPassword)}><Copy size={16} /></button>
                </div>
              </div>
            </div>

            <button onClick={() => setNewCompanyCredentials(null)} className="ux-btn-primary full">
              Fermer et continuer
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE */}
      {deleteConfirmModal && (
        <div className="ux-modal-overlay" onClick={() => setDeleteConfirmModal(null)}>
          <div className="ux-modal-card danger" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="ux-modal-header" style={{ marginBottom: '1.5rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={24} /> ❗️ ATTENTION ❗️
                </h2>
              </div>
              <button onClick={() => setDeleteConfirmModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ textAlign: 'left', marginBottom: '2rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              <p style={{ margin: '0 0 10px', color: 'var(--text-primary)', fontWeight: '600' }}>Suppression définitive !</p>
              <p style={{ margin: '0 0 15px' }}>Cette action va détruire l'entreprise <strong>{deleteConfirmModal.nom}</strong>, TOUTES ses cartes configurées, et TOUS les clients associés de façon irréversible.</p>
              <p style={{ margin: 0, fontWeight: '500' }}>Êtes-vous absolument sûr ?</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteConfirmModal(null)} className="ux-btn-secondary" style={{ flex: 1, padding: '12px' }}>Annuler</button>
              <button onClick={handleConfirmDelete} style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>Oui, supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT COMPANY */}
      {editingCompany && (
        <div className="ux-modal-overlay" onClick={() => setEditingCompany(null)}>
          <div className="ux-modal-card" onClick={e => e.stopPropagation()}>
            <div className="ux-modal-header" style={{ marginBottom: '1.5rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Modifier {editingCompany.nom}</h2>
                <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: '0.9rem' }}>Modifiez les informations du commerce</p>
              </div>
              <button onClick={() => setEditingCompany(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleUpdateCompany} className="ux-form-premium" style={{ textAlign: 'left' }}>
              <div className="ux-form-group">
                <label>Nom du commerce</label>
                <input 
                  type="text" value={editingCompany.nom} 
                  onChange={e => setEditingCompany({...editingCompany, nom: e.target.value})}
                  required
                />
              </div>
              <div className="ux-form-group">
                <label>Email (Identifiant de connexion)</label>
                <input 
                  type="email" value={editingCompany.email} 
                  onChange={e => setEditingCompany({...editingCompany, email: e.target.value})}
                  required
                />
              </div>
              <div className="ux-form-row-compact">
                <div className="ux-form-group">
                  <label>Gérant</label>
                  <input 
                    type="text" value={editingCompany.prenom || ''} 
                    onChange={e => setEditingCompany({...editingCompany, prenom: e.target.value})}
                  />
                </div>
                <div className="ux-form-group">
                  <label>Téléphone</label>
                  <input 
                    type="tel" value={editingCompany.telephone || ''} 
                    onChange={e => setEditingCompany({...editingCompany, telephone: e.target.value})}
                  />
                </div>
              </div>
              <div className="ux-form-footer" style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setEditingCompany(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-medium)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '500', fontSize: '1rem', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-surface)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  Annuler
                </button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '12px', background: 'var(--accent-color, #3b82f6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                  {submitting ? <Loader2 className="spin" size={20} /> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOP NAVBAR */}
      <nav className="ux-navbar">
        <div className="ux-nav-left">
          <img src="/logo-fidelyz.png" alt="Fidelyz" style={{ height: '36px', objectFit: 'contain' }} />
          <h1>Fidelyz Control</h1>
        </div>

        <div className="ux-nav-center desktop-only">
          <button className={`ux-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <PieChart size={18} /> Vue d'ensemble
          </button>
          <button className={`ux-tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
            <LayoutDashboard size={18} /> Gestion
          </button>
          <button className={`ux-tab-btn ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
            <PlusCircle size={18} /> Nouveau
          </button>
          <button className={`ux-tab-btn ${activeTab === 'legal' ? 'active' : ''}`} onClick={() => setActiveTab('legal')}>
            <FileText size={18} /> Légal
          </button>
        </div>

        <div className="ux-nav-right">
          <button className="ux-theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="ux-btn-logout" onClick={() => logout()}>
            <LogOut size={18} /> <span className="desktop-only">Quitter</span>
          </button>
        </div>
      </nav>

      {/* MOBILE NAV (TABS REPLACEMENT) */}
      <div className="ux-mobile-tabs mobile-only">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}><PieChart size={20} /></button>
        <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}><LayoutDashboard size={20} /></button>
        <button className={activeTab === 'create' ? 'active' : ''} onClick={() => setActiveTab('create')}><PlusCircle size={20} /></button>
        <button className={activeTab === 'legal' ? 'active' : ''} onClick={() => setActiveTab('legal')}><FileText size={20} /></button>
      </div>

      <main className="ux-content">
        {error && <div className="ux-alert error"><AlertCircle size={18} /> {error}</div>}
        {success && <div className="ux-alert success"><CheckCircle2 size={18} /> {success}</div>}

        {/* VIEW: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="ux-view-fade">
            <header className="ux-view-header" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'var(--accent-alpha)', borderRadius: '12px', color: 'var(--accent-color)' }}>
                  <Activity size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>Réseau Global Fideliz</h2>
                  <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: '0.95rem' }}>Aperçu en temps réel de votre écosystème de partenaires.</p>
                </div>
              </div>
            </header>

            <div className="ux-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              <div className="ux-stat-card" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.02) 100%)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="ux-stat-icon" style={{ background: '#3b82f6', color: '#fff' }}><Building2 size={22} /></div>
                <div className="ux-stat-data">
                  <span className="ux-stat-label">Commerces Inscrits</span>
                  <span className="ux-stat-value" style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>{stats.total}</span>
                </div>
              </div>
              <div className="ux-stat-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="ux-stat-icon" style={{ background: '#10b981', color: '#fff' }}><CheckCircle2 size={22} /></div>
                <div className="ux-stat-data">
                  <span className="ux-stat-label">Abonnements Actifs</span>
                  <span className="ux-stat-value" style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>{stats.active}</span>
                </div>
              </div>
              <div className="ux-stat-card" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="ux-stat-icon" style={{ background: '#ef4444', color: '#fff' }}><ShieldAlert size={22} /></div>
                <div className="ux-stat-data">
                  <span className="ux-stat-label">Comptes Suspendus</span>
                  <span className="ux-stat-value" style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>{stats.suspended}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
              <div className="ux-welcome-banner" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '2rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="ux-banner-text">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', marginBottom: '8px' }}>
                    <Store size={20} color="var(--accent-color)" />
                    Ajouter un nouveau partenaire
                  </h3>
                  <p style={{ margin: 0, opacity: 0.7, maxWidth: '400px', lineHeight: '1.5' }}>Générez une nouvelle instance isolée pour un commerçant avec ses identifiants et accès en 2 clics.</p>
                </div>
                <button className="ux-btn-accent" onClick={() => setActiveTab('create')} style={{ padding: '12px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PlusCircle size={18} /> Lancer la création
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: LIST */}
        {activeTab === 'list' && (
          <div className="ux-view-fade">
            <header className="ux-view-header">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px'}}>
                <div>
                  <h2>Gestion des Commerces</h2>
                  <p>Administrez les accès et le statut des partenaires.</p>
                </div>
                <div className="ux-search-box">
                  <Search size={18} />
                  <input 
                    type="text" placeholder="Rechercher..." 
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                  />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="tous">Tous</option>
                    <option value="actif">Actifs</option>
                    <option value="suspendu">Suspendus</option>
                  </select>
                </div>
              </div>
            </header>

            {loading ? (
              <div className="ux-loading-center"><Loader2 size={40} className="spin" /></div>
            ) : enterprises.length === 0 ? (
              <div className="ux-empty-state">Aucun commerce disponible.</div>
            ) : (
              <div className="ux-grid-commerces">
                {filteredEnterprises.map(ent => (
                  <div key={ent.id} className={`ux-ent-card ${ent.statut}`}>
                    <div className="ux-card-top">
                      <h3 onClick={() => copyToClipboard(ent.nom)} title="Copier le nom">{ent.nom}</h3>
                      <span className={`ux-badge ${ent.statut}`}>{ent.statut === 'actif' ? 'Actif' : 'Suspendu'}</span>
                    </div>
                    
                    <div className="ux-card-details">
                      <div className="ux-detail">
                        <span>Gérant</span>
                        <div className="ux-copy-row">
                          <strong onClick={() => copyToClipboard(ent.prenom)}>{ent.prenom || 'N/A'}</strong>
                          <button onClick={() => copyToClipboard(ent.prenom)} className="ux-mini-copy"><Copy size={12} /></button>
                        </div>
                      </div>
                      <div className="ux-detail">
                        <span>Téléphone</span>
                        <div className="ux-copy-row">
                          <strong onClick={() => copyToClipboard(ent.telephone)}>{ent.telephone || 'N/A'}</strong>
                          <button onClick={() => copyToClipboard(ent.telephone)} className="ux-mini-copy"><Copy size={12} /></button>
                        </div>
                      </div>
                      <div className="ux-detail">
                        <span>Email de connexion</span>
                        <div className="ux-copy-row">
                          <strong onClick={() => copyToClipboard(ent.email)}>{ent.email}</strong>
                          <button onClick={() => copyToClipboard(ent.email)} className="ux-mini-copy"><Copy size={12} /></button>
                        </div>
                      </div>
                      <div className="ux-detail">
                        <span>ID Unique</span>
                        <code className="ux-id-code" onClick={() => copyToClipboard(ent.id)}>#{ent.id}</code>
                      </div>
                      {ent.temporary_password && (
                        <div className="ux-detail full-width">
                          <span>Pass Temporaire</span>
                          <div className="ux-copy-row-highlight">
                            <code onClick={() => copyToClipboard(ent.temporary_password)}>{ent.temporary_password}</code>
                            <button onClick={() => copyToClipboard(ent.temporary_password)} className="ux-mini-copy"><Copy size={14} /></button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ux-card-footer">
                      <div className="ux-actions-cluster">
                        {ent.statut === 'actif' ? (
                          <button onClick={() => handleSuspend(ent.id)} className="ux-btn-icon" title="Suspendre"><Lock size={16} /></button>
                        ) : (
                          <button onClick={() => handleReactivate(ent.id)} className="ux-btn-icon green" title="Réactiver"><Unlock size={16} /></button>
                        )}
                        <button onClick={() => setEditingCompany({...ent})} className="ux-btn-icon blue" title="Modifier infos"><Edit2 size={16} /></button>
                        <button onClick={() => setDeleteConfirmModal(ent)} className="ux-btn-icon red" title="Supprimer (Attention)"><Trash2 size={16} /></button>
                        <button onClick={() => copyAllInfo(ent)} className="ux-btn-icon gray" title="Tout copier"><Copy size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: CREATE */}
        {activeTab === 'create' && (
          <div className="ux-view-fade">
             <header className="ux-view-header">
              <h2>Nouveau Partenaire</h2>
              <p>Remplissez les informations pour générer un compte commerçant.</p>
            </header>

            <div className="ux-form-container">
              <form onSubmit={handleCreateCompany} className="ux-form-premium">
                <div className="ux-form-group">
                  <label>Nom de l'entreprise</label>
                  <input 
                    type="text" value={formData.nom} 
                    onChange={e => setFormData({...formData, nom: e.target.value})}
                    placeholder="Brasserie, Boutique, Coiffeur..." 
                    required
                  />
                </div>
                <div className="ux-form-row-compact">
                  <div className="ux-form-group">
                    <label>Prénom Gérant</label>
                    <input 
                      type="text" value={formData.prenom} 
                      onChange={e => setFormData({...formData, prenom: e.target.value})}
                      placeholder="Ex: Jean" 
                    />
                  </div>
                  <div className="ux-form-group">
                    <label>Téléphone</label>
                    <input 
                      type="tel" value={formData.telephone} 
                      onChange={e => setFormData({...formData, telephone: e.target.value})}
                      placeholder="06..." 
                    />
                  </div>
                </div>
                <div className="ux-form-group">
                  <label>Email Administrateur</label>
                  <input 
                    type="email" value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="contact@commerce.fr" 
                    required
                  />
                </div>
                {/* Loyalty type removed, defaulting to points */}

                <div className="ux-form-footer">
                  <button type="submit" className="ux-btn-primary lrg" disabled={submitting}>
                    {submitting ? <Loader2 className="spin" size={22} /> : 'Finaliser la création'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* VIEW: LEGAL */}
        {activeTab === 'legal' && (
          <div className="ux-view-fade">
            <header className="ux-view-header">
              <h2>Mentions Légales</h2>
              <p>Éditez le contenu affiché sur la page publique <code>/mentions-legales</code>. Le contenu supporte les balises HTML.</p>
            </header>

            <div className="ux-form-container">
              <div className="ux-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <FileText size={16} /> Contenu HTML des mentions légales
                </label>
                <textarea
                  value={legalContent}
                  onChange={e => setLegalContent(e.target.value)}
                  rows={28}
                  spellCheck={false}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    lineHeight: '1.6',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="<h1>Mentions Légales</h1>&#10;<p>Contenu…</p>"
                />
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                  Utilisez les balises HTML standard : &lt;h1&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;a&gt;, etc.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <a
                  href="/mentions-legales"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ux-btn-secondary"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Prévisualiser
                </a>
                <button
                  onClick={saveLegalContent}
                  disabled={legalSaving}
                  className="ux-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {legalSaving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                  {legalSaving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard