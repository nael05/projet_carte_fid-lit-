import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { 
  AlertCircle, CheckCircle2, Loader2, X, Plus, Search, 
  Lock, Unlock, Trash2, Key, Star, Stamp, LogOut, 
  ShieldAlert, LayoutDashboard, Copy, ExternalLink, Users,
  Sun, Moon, PieChart, PlusCircle, Filter
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
  
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    loyalty_type: 'points'
  })

  const navigate = useNavigate()
  const { logout, token } = useAuth()

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
  }, [token])

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
        loyalty_type: formData.loyalty_type
      })
      
      setNewCompanyCredentials({
        ...response.data,
        nom: formData.nom
      })

      setSuccess('Entreprise créée avec succès!')
      setFormData({ nom: '', email: '', loyalty_type: 'points' })
      
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

  const handleDelete = async (companyId) => {
    if (!window.confirm('Suppression définitive?')) return
    try {
      await api.delete(`/admin/delete-company/${companyId}`)
      setSuccess('Entreprise supprimée')
      loadEnterprises()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
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

      {/* TOP NAVBAR */}
      <nav className="ux-navbar">
        <div className="ux-nav-left">
          <div className="ux-logo-icon"><ShieldAlert size={22} /></div>
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
      </div>

      <main className="ux-content">
        {error && <div className="ux-alert error"><AlertCircle size={18} /> {error}</div>}
        {success && <div className="ux-alert success"><CheckCircle2 size={18} /> {success}</div>}

        {/* VIEW: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="ux-view-fade">
            <header className="ux-view-header">
              <h2>Tableau de bord stratégique</h2>
              <p>Résumé de l'activité du réseau Fidelyz.</p>
            </header>

            <div className="ux-stats-grid">
              <div className="ux-stat-card">
                <div className="ux-stat-icon blue"><Users size={24} /></div>
                <div className="ux-stat-data">
                  <span className="ux-stat-label">Total Entreprises</span>
                  <span className="ux-stat-value">{stats.total}</span>
                </div>
              </div>
              <div className="ux-stat-card">
                <div className="ux-stat-icon green"><CheckCircle2 size={24} /></div>
                <div className="ux-stat-data">
                  <span className="ux-stat-label">Actifs</span>
                  <span className="ux-stat-value">{stats.active}</span>
                </div>
              </div>
              <div className="ux-stat-card">
                <div className="ux-stat-icon red"><ShieldAlert size={24} /></div>
                <div className="ux-stat-data">
                  <span className="ux-stat-label">Suspendus</span>
                  <span className="ux-stat-value">{stats.suspended}</span>
                </div>
              </div>
            </div>

            <div className="ux-welcome-banner">
              <div className="ux-banner-text">
                <h3>Voulez-vous lancer un nouveau partenaire ?</h3>
                <p>La configuration prend moins de 2 minutes.</p>
              </div>
              <button className="ux-btn-accent" onClick={() => setActiveTab('create')}>Lancer la création</button>
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
                      <h3>{ent.nom}</h3>
                      <span className={`ux-badge ${ent.statut}`}>{ent.statut === 'actif' ? 'Actif' : 'Suspendu'}</span>
                    </div>
                    
                    <div className="ux-card-details">
                      <div className="ux-detail">
                        <span>ID</span>
                        <code className="ux-id-code">#{ent.id}</code>
                      </div>
                      <div className="ux-detail">
                        <span>Contact</span>
                        <strong>{ent.email}</strong>
                      </div>
                    </div>

                    <div className="ux-card-footer">
                      <div className="ux-actions-cluster">
                        {ent.statut === 'actif' ? (
                          <button onClick={() => handleSuspend(ent.id)} className="ux-btn-icon" title="Suspendre"><Lock size={16} /></button>
                        ) : (
                          <button onClick={() => handleReactivate(ent.id)} className="ux-btn-icon green" title="Réactiver"><Unlock size={16} /></button>
                        )}
                        <button onClick={() => handleDelete(ent.id)} className="ux-btn-icon red" title="Supprimer"><Trash2 size={16} /></button>
                      </div>
                      <button className="ux-btn-outline small" onClick={() => window.open(`mailto:${ent.email}`)}><ExternalLink size={14} /> Contact</button>
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
      </main>
    </div>
  )
}

export default AdminDashboard