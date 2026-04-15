import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { 
  AlertCircle, CheckCircle2, Loader2, X, Plus, Search, 
  Lock, Unlock, Trash2, Key, Star, Stamp, LogOut, 
  ShieldAlert, LayoutDashboard, Copy, ExternalLink 
} from 'lucide-react'
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
  const [newCompanyCredentials, setNewCompanyCredentials] = useState(null)
  
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
      
      let data = response.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
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
    
    if (!formData.nom || !formData.nom.trim()) {
      setError('Le nom de l\'entreprise est requis')
      return
    }
    
    if (!formData.email || !formData.email.trim()) {
      setError('L\'email est requis')
      return
    }
    
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
      setError(err.response?.data?.error || 'Erreur lors de la suspension')
    }
  }

  const handleReactivate = async (companyId) => {
    if (!window.confirm('Réactiver cette entreprise?')) return
    try {
      await api.put(`/admin/reactivate-company/${companyId}`)
      setSuccess('Entreprise réactivée avec succès')
      loadEnterprises()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la réactivation')
    }
  }

  const handleDelete = async (companyId) => {
    if (!window.confirm('ATTENTION: Suppression définitive!\n\nCette action supprimera l\'entreprise ET tous ses clients.\nÊtes-vous sûr?')) return
    try {
      await api.delete(`/admin/delete-company/${companyId}`)
      setSuccess('Entreprise supprimée avec succès')
      loadEnterprises()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  const stats = {
    total: enterprises.length,
    active: enterprises.filter(e => e.statut === 'actif').length,
    suspended: enterprises.filter(e => e.statut === 'suspendu').length
  }

  const filteredEnterprises = enterprises.filter(ent => {
    const searchLower = searchTerm.toLowerCase().trim()
    if (!searchLower) return filterStatus === 'tous' || ent.statut === filterStatus
    const nomMatch = (ent.nom || '').toLowerCase().includes(searchLower)
    const emailMatch = (ent.email || '').toLowerCase().includes(searchLower)
    const idMatch = String(ent.id || '').toLowerCase().includes(searchLower)
    return (nomMatch || emailMatch || idMatch) && (filterStatus === 'tous' || ent.statut === filterStatus)
  })

  return (
    <div className="dashboard-container admin-luxe">
      <div className="admin-bg-mesh"></div>

      {/* MODAL CREDENTIALS LUXE */}
      {newCompanyCredentials && (
        <div className="modal-overlay-luxe" onClick={() => setNewCompanyCredentials(null)}>
          <div className="modal-content-luxe" onClick={e => e.stopPropagation()}>
            <div className="modal-header-luxe">
              <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
              <h2>Entreprise créée !</h2>
              <p style={{ color: '#94A3B8' }}>{newCompanyCredentials.nom}</p>
            </div>
            
            <div className="credentials-cluster">
              <div className="cred-item">
                <div className="cred-label">Identifiant Email</div>
                <div className="cred-row">
                  <span className="cred-value">{newCompanyCredentials.email}</span>
                  <button onClick={() => navigator.clipboard.writeText(newCompanyCredentials.email)} className="btn-copy-luxe">Copier</button>
                </div>
              </div>
              <div className="cred-item">
                <div className="cred-label">Mot de passe temporaire</div>
                <div className="cred-row">
                  <span className="cred-value">{newCompanyCredentials.temporaryPassword}</span>
                  <button onClick={() => navigator.clipboard.writeText(newCompanyCredentials.temporaryPassword)} className="btn-copy-luxe">Copier</button>
                </div>
              </div>
            </div>

            <button onClick={() => setNewCompanyCredentials(null)} className="btn-luxe-create" style={{ width: '100%', justifyContent: 'center' }}>
              Terminer
            </button>
          </div>
        </div>
      )}

      {/* LUXE HEADER */}
      <header className="admin-luxe-header">
        <div className="admin-logo-section">
          <span className="admin-badge">Master</span>
          <h1 className="admin-title-luxe">Fidelyz Control</h1>
        </div>
        <div className="admin-header-actions">
          <button onClick={() => logout()} className="btn-luxe-logout">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </header>

      <main className="admin-luxe-main">
        {/* STATS BAND */}
        <section className="admin-stats-band">
          <div className="stat-luxe-card">
            <div className="stat-icon-box total"><Users size={24} /></div>
            <div className="stat-info">
              <h4>Total Entreprises</h4>
              <div className="number">{stats.total}</div>
            </div>
          </div>
          <div className="stat-luxe-card">
            <div className="stat-icon-box active"><CheckCircle2 size={24} /></div>
            <div className="stat-info">
              <h4>Commerces Actifs</h4>
              <div className="number">{stats.active}</div>
            </div>
          </div>
          <div className="stat-luxe-card">
            <div className="stat-icon-box suspended"><ShieldAlert size={24} /></div>
            <div className="stat-info">
              <h4>Comptes Suspendus</h4>
              <div className="number">{stats.suspended}</div>
            </div>
          </div>
        </section>

        {/* MESSAGES */}
        {error && <div className="luxe-alert error" style={{marginBottom: '24px'}}><AlertCircle size={18} />{error}</div>}
        {success && <div className="luxe-alert" style={{marginBottom: '24px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981'}}><CheckCircle2 size={18} />{success}</div>}

        {/* CREATE SECTION */}
        {showCreateForm && (
          <section className="admin-luxe-section">
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '24px'}}>
              <h2 style={{fontSize: '20px', fontWeight: 800}}>Nouvelle Entreprise</h2>
              <button onClick={() => setShowCreateForm(false)} className="btn-ent-action"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCompany} className="luxe-form-grid">
              <div className="luxe-form-group">
                <label>Nom du commerce</label>
                <input 
                  type="text" value={formData.nom} 
                  onChange={e => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Brasserie du Centre" 
                  required
                />
              </div>
              <div className="luxe-form-group">
                <label>Email de contact</label>
                <input 
                  type="email" value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="pro@commerce.com" 
                  required
                />
              </div>
              <div className="luxe-form-group">
                <label>Système de fidélité</label>
                <select value={formData.loyalty_type} onChange={e => setFormData({...formData, loyalty_type: e.target.value})}>
                  <option value="points">Points cumulables</option>
                  <option value="stamps">Tampons (Stamps)</option>
                </select>
              </div>
              <div style={{display: 'flex', alignItems: 'flex-end'}}>
                <button type="submit" disabled={submitting} className="btn-luxe-create" style={{width: '100%', justifyContent: 'center'}}>
                  {submitting ? <Loader2 className="spin" size={20} /> : 'Confirmer la création'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* CONTROLS */}
        <section className="admin-controls-luxe">
          <div className="search-wrapper-luxe">
            <Search size={20} />
            <input 
              type="text" 
              placeholder="Rechercher par ID, Email ou Nom..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setShowCreateForm(true)} className="btn-luxe-create">
            <Plus size={20} /> Nouvelle entreprise
          </button>
        </section>

        {/* GRID */}
        {loading ? (
          <div style={{textAlign: 'center', padding: '60px'}}><Loader2 className="spin" size={40} color="#007AFF" /></div>
        ) : enterprises.length === 0 ? (
          <div style={{textAlign: 'center', padding: '60px', color: '#94A3B8'}}>Aucune entreprise trouvée</div>
        ) : filteredEnterprises.length === 0 ? (
          <div style={{textAlign: 'center', padding: '60px', color: '#94A3B8'}}>Aucun résultat pour cette recherche</div>
        ) : (
          <div className="enterprises-grid-luxe">
            {filteredEnterprises.map(ent => (
              <div key={ent.id} className={`ent-luxe-card status-${ent.statut}`}>
                <div className="status-indicator"></div>
                <div className="ent-card-header">
                  <h3>{ent.nom}</h3>
                  <span className={`badge-luxe ${ent.statut}`}>{ent.statut === 'actif' ? 'Actif' : 'Suspendu'}</span>
                </div>
                <div className="ent-card-body">
                  <div className="ent-info-row">
                    <span className="label">Identifiant</span>
                    <span className="value id">#{ent.id}</span>
                  </div>
                  <div className="ent-info-row">
                    <span className="label">Contact</span>
                    <span className="value">{ent.email}</span>
                  </div>
                  {ent.temporary_password && (
                    <div className="ent-info-row">
                      <span className="label"><Key size={14} /> Pass Temp</span>
                      <span className="value" style={{color: '#38BDF8', fontWeight: 700}}>{ent.temporary_password}</span>
                    </div>
                  )}
                  <div className="ent-info-row">
                    <span className="label">Fidélité</span>
                    <span className="value">{ent.loyalty_type === 'points' ? <><Star size={14} /> Points</> : <><Stamp size={14} /> Timbres</>}</span>
                  </div>
                </div>
                <div className="ent-card-actions">
                  {ent.statut === 'actif' ? (
                    <button onClick={() => handleSuspend(ent.id)} className="btn-ent-action">
                      <Lock size={14} /> Suspendre
                    </button>
                  ) : (
                    <button onClick={() => handleReactivate(ent.id)} className="btn-ent-action">
                      <Unlock size={14} /> Réactiver
                    </button>
                  )}
                  <button onClick={() => handleDelete(ent.id)} className="btn-ent-action danger">
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard