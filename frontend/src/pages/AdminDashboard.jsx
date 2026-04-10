import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { AlertCircle, CheckCircle2, Loader2, X, Plus, Search, Lock, Unlock, Trash2, Copy, ExternalLink, Star, Stamp, Key, BarChart3, LogOut } from 'lucide-react'
import './Dashboard.css'
import './AdminDashboard.css'

function AdminDashboard() {
  const [enterprises, setEnterprises] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [newCompanyCredentials, setNewCompanyCredentials] = useState(null) // Modal
  
  // Form data
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    loyalty_type: 'points'
  })

  const navigate = useNavigate()
  const { logout, token } = useAuth()

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
      console.log('Enterprises loaded:', response.data)
      
      // Handle both array and object response formats
      let data = response.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // If it's an object with a "value" property, use that
        data = data.value || []
      }
      
      const enterprises = Array.isArray(data) ? data : []
      setEnterprises(enterprises)
      
      if (enterprises.length === 0) {
        console.warn('Aucune entreprise trouvée')
      }
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
    
    // Validation
    if (!formData.nom || !formData.nom.trim()) {
      setError('Le nom de l\'entreprise est requis')
      return
    }
    
    if (!formData.email || !formData.email.trim()) {
      setError('L\'email est requis')
      return
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Email invalide')
      return
    }
    
    setSubmitting(true)

    try {
      const response = await api.post('/admin/create-company', {
        nom: formData.nom,
        email: formData.email,
        loyalty_type: formData.loyalty_type
      })
      
      // Afficher le modal avec les credentials
      setNewCompanyCredentials({
        companyId: response.data.companyId,
        email: response.data.email,
        temporaryPassword: response.data.temporaryPassword,
        loyalty_type: response.data.loyalty_type,
        nom: formData.nom
      })

      setSuccess('Entreprise créée avec succès!')
      setFormData({ nom: '', email: '', loyalty_type: 'points' })
      setShowCreateForm(false)
      
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
      setSuccess('Entreprise suspendue avec succès')
      loadEnterprises()
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la suspension'
      setError(`Impossible de suspendre: ${errorMsg}`)
    }
  }

  const handleReactivate = async (companyId) => {
    if (!window.confirm('Réactiver cette entreprise?')) return

    try {
      await api.put(`/admin/reactivate-company/${companyId}`)
      setSuccess('Entreprise réactivée avec succès')
      loadEnterprises()
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la réactivation'
      setError(`Impossible de réactiver: ${errorMsg}`)
    }
  }

  const handleDelete = async (companyId) => {
    if (!window.confirm('ATTENTION: Suppression définitive!\n\nCette action supprimera l\'entreprise ET tous ses clients.\nÊtes-vous sûr?')) return

    try {
      await api.delete(`/admin/delete-company/${companyId}`)
      setSuccess('Entreprise supprimée avec succès')
      loadEnterprises()
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la suppression'
      setError(`Impossible de supprimer: ${errorMsg}`)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/master-admin-secret')
  }

  // Filtrage
  const filteredEnterprises = enterprises.filter(ent => {
    const searchLower = searchTerm.toLowerCase().trim()
    
    // Si la recherche est vide, retourner tous les éléments
    if (!searchLower) {
      return filterStatus === 'tous' || ent.statut === filterStatus
    }
    
    // Convertir tous les champs en string pour la recherche
    const nomMatch = (ent.nom || '').toLowerCase().includes(searchLower)
    const emailMatch = (ent.email || '').toLowerCase().includes(searchLower)
    const idMatch = String(ent.id || '').toLowerCase().includes(searchLower)
    
    const matchesSearch = nomMatch || emailMatch || idMatch
    const matchesStatus = filterStatus === 'tous' || ent.statut === filterStatus
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="dashboard-container">
      {/* Modal Credentials */}
      {newCompanyCredentials && (
        <div className="modal-overlay" onClick={() => setNewCompanyCredentials(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setNewCompanyCredentials(null)}><X size={18} /></button>
            <div className="modal-header">
              <h2>Entreprise créée!</h2>
              <p className="modal-company-name">{newCompanyCredentials.nom}</p>
            </div>
            
            <div className="modal-body">
              <p className="modal-instruction">Partagez ces identifiants avec l'entreprise:</p>
              
              <div className="credentials-box">
                <div className="credential-item">
                  <label>ID de l'entreprise</label>
                  <div className="credential-value">
                    <span className="id-display">{newCompanyCredentials.companyId}</span>
                    <button onClick={() => navigator.clipboard.writeText(newCompanyCredentials.companyId)} className="copy-btn">Copier</button>
                  </div>
                </div>

                <div className="credential-item">
                  <label>Email (identifiant)</label>
                  <div className="credential-value">
                    <span>{newCompanyCredentials.email}</span>
                    <button onClick={() => navigator.clipboard.writeText(newCompanyCredentials.email)} className="copy-btn">Copier</button>
                  </div>
                </div>
                
                <div className="credential-item">
                  <label>Mot de passe temporaire</label>
                  <div className="credential-value">
                    <span className="password-display">{newCompanyCredentials.temporaryPassword}</span>
                    <button onClick={() => navigator.clipboard.writeText(newCompanyCredentials.temporaryPassword)} className="copy-btn">Copier</button>
                  </div>
                </div>

                <div className="credential-item">
                  <label>Type de fidélité</label>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {newCompanyCredentials.loyalty_type === 'points' ? <><Star size={14} /> Points</> : <><Stamp size={14} /> Timbres</>}
                  </span>
                </div>
              </div>

              <div className="modal-warning">
                <p>L'entreprise devra changer ce mot de passe lors de sa première connexion.</p>
              </div>

              <div className="modal-link">
                <p>Lien de connexion pro:</p>
                <a href="/pro/login" target="_blank" rel="noopener noreferrer" className="login-link">
                  Accéder à la connexion pro
                </a>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setNewCompanyCredentials(null)} className="btn-primary">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h3>Fidelyz Admin</h3>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-item active">
            <BarChart3 size={18} />
            <span>Tableau de bord</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-content">
            <h1>Gestion des Entreprises</h1>
            <p className="header-subtitle">Gérez tous les commerces et leurs comptes de fidélité</p>
          </div>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary"
          >
            {showCreateForm ? 'Annuler' : <><Plus size={16} /> Nouvelle entreprise</>}
          </button>
        </header>

        {/* Messages */}
        {error && (
          <div className="alert error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> <span>{success}</span>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="create-form-section">
            <h2>Créer une nouvelle entreprise</h2>
            <form onSubmit={handleCreateCompany} className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nom de l'entreprise</label>
                  <input
                    type="text"
                    placeholder="Ex: Café La Pause"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="contact@cafe.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type de fidélité</label>
                  <select
                    value={formData.loyalty_type}
                    onChange={(e) => setFormData({...formData, loyalty_type: e.target.value})}
                  >
                    <option value="points">Points</option>
                    <option value="stamps">Timbres/Stamps</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Création...</> : 'Créer l\'entreprise'}
              </button>
            </form>
          </div>
        )}

        {/* Search & Filter */}
        <div className="search-filter-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Rechercher par id, nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-buttons">
            <button
              className={`filter-btn${filterStatus === 'tous' ? ' active' : ''}`}
              onClick={() => setFilterStatus('tous')}
            >
              Tous ({enterprises.length})
            </button>
            <button
              className={`filter-btn${filterStatus === 'actif' ? ' active' : ''}`}
              onClick={() => setFilterStatus('actif')}
            >
              Actifs ({enterprises.filter(e => e.statut === 'actif').length})
            </button>
            <button
              className={`filter-btn${filterStatus === 'suspendu' ? ' active' : ''}`}
              onClick={() => setFilterStatus('suspendu')}
            >
              Suspendus ({enterprises.filter(e => e.statut === 'suspendu').length})
            </button>
          </div>
        </div>

        {/* Enterprises List */}
        <div className="enterprises-section">
          {loading ? (
            <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <p>Chargement des entreprises...</p>
            </div>
          ) : enterprises.length === 0 ? (
            <div className="empty-state">
              <p>Aucune entreprise trouvée</p>
              <p style={{fontSize: '14px', color: 'var(--text-tertiary)'}}>Créez votre première entreprise pour commencer</p>
            </div>
          ) : filteredEnterprises.length === 0 ? (
            <div className="empty-state">
              <p>Aucune entreprise ne correspond à votre recherche</p>
              <p style={{fontSize: '14px', color: 'var(--text-tertiary)'}}>Essayez avec un autre ID, nom ou email</p>
            </div>
          ) : (
            <div className="enterprises-grid">
              {filteredEnterprises.map((enterprise) => (
                <div key={enterprise.id} className={`enterprise-card status-${enterprise.statut}`}>
                  <div className="card-header">
                    <h3>{enterprise.nom}</h3>
                    <span className={`status-badge status-${enterprise.statut}`}>
                      {enterprise.statut === 'actif' ? 'Actif' : 'Suspendu'}
                    </span>
                  </div>

                  <div className="card-body">
                    <div className="info-row">
                      <span className="label">ID:</span>
                      <span className="value id-text">{enterprise.id}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Email:</span>
                      <span className="value">{enterprise.email}</span>
                    </div>
                    {enterprise.temporary_password && (
                      <div className="info-row temp-password-row">
                        <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Key size={14} /> Mot de passe temp:</span>
                        <span className="value password-value">{enterprise.temporary_password}</span>
                      </div>
                    )}
                    <div className="info-row">
                      <span className="label">Fidélité:</span>
                      <span className="value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {enterprise.loyalty_type === 'points' ? <><Star size={14} /> Points</> : <><Stamp size={14} /> Timbres</>}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Créée:</span>
                      <span className="value">
                        {new Date(enterprise.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  <div className="card-actions">
                    {enterprise.statut === 'actif' ? (
                      <button
                        onClick={() => handleSuspend(enterprise.id)}
                        className="btn-secondary btn-small"
                        title="Suspendre cette entreprise"
                      >
                        <Lock size={14} /> Suspendre
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(enterprise.id)}
                        className="btn-secondary btn-small"
                        title="Réactiver cette entreprise"
                      >
                        <Unlock size={14} /> Réactiver
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(enterprise.id)}
                      className="btn-danger btn-small"
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard