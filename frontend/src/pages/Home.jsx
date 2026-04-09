import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Grid, Users, Home as HomeIcon } from '../icons/Icons'
import api from '../api'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Loyalty Cards SaaS</h1>
        <p>Plateforme B2B de gestion de cartes de fidélité dématérialisées</p>
      </header>

      <div className="home-content">
        {/* Admin Role */}
        <div className="interface-card admin-card">
          <div className="card-icon">
            <Grid size={28} />
          </div>
          <h2>Master Admin</h2>
          <p className="card-description">
            Gérez les entreprises de votre SaaS
          </p>
          <ul className="card-features">
            <li>Créer une entreprise</li>
            <li>Générer mots de passe</li>
            <li>Suspendre/Réactiver</li>
            <li>Supprimer (cascade)</li>
          </ul>
          <div className="card-footer">
            <small>Interface: Propriétaire du SaaS</small>
          </div>
          <button
            onClick={() => navigate('/master-admin-secret')}
            className="btn-primary"
          >
            Accéder
          </button>
        </div>

        {/* Pro Role */}
        <div className="interface-card pro-card">
          <div className="card-icon">
            <Users size={28} />
          </div>
          <h2>Compte Pro</h2>
          <p className="card-description">
            Gérez vos clients et leurs points
          </p>
          <ul className="card-features">
            <li>Scanner QR codes</li>
            <li>Ajouter des points</li>
            <li>Voir tous les clients</li>
            <li>Configurer récompenses</li>
          </ul>
          <div className="card-footer">
            <small>Interface: Commerçants / Propriétaires de magasin</small>
          </div>
          <button
            onClick={() => navigate('/pro/login')}
            className="btn-primary"
          >
            Se Connecter
          </button>
        </div>

        {/* Client Public Role */}
        <div className="interface-card client-card">
          <div className="card-icon">
            <HomeIcon size={28} />
          </div>
          <h2>Client Public</h2>
          <p className="card-description">
            Créer votre carte de fidélité
          </p>
          <ul className="card-features">
            <li>Scanner QR au comptoir</li>
            <li>Créer sa carte</li>
            <li>Ajouter au Wallet</li>
            <li>Suivre les points</li>
          </ul>
          <div className="card-footer">
            <small>Interface: Clients (accès public)</small>
          </div>
          <DemoClientAccess />
        </div>
      </div>

      {/* Info Section */}
      <div className="home-info">
        <div className="info-box">
          <h3>Structure du Système</h3>
          <p>
            Ce SaaS fonctionne avec 3 niveaux d'accès totalement isolés:
          </p>
          <ul>
            <li><strong>Master Admin</strong> (1) → Gère le SaaS entier</li>
            <li><strong>Entreprises</strong> (N) → Commerçants utilisant le platform</li>
            <li><strong>Clients</strong> (N×M) → Clients de chaque entreprise</li>
          </ul>
        </div>

        <div className="info-box">
          <h3>Sécurité</h3>
          <ul>
            <li>Isolation complète des données par entreprise</li>
            <li>JWT + RBAC (Role-Based Access Control)</li>
            <li>Hachage bcryptjs pour les mots de passe</li>
            <li>Authentification obligatoire pour les pros</li>
          </ul>
        </div>
      </div>

      <footer className="home-footer">
        <p>Loyalty Cards SaaS v1.0.0</p>
        <p>Backend: http://localhost:5000 | Frontend: http://localhost:3000</p>
      </footer>
    </div>
  )
}

function DemoClientAccess() {
  const [showForm, setShowForm] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedId, setSelectedId] = React.useState('')
  const [enterprises, setEnterprises] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (showForm && enterprises.length === 0) {
      fetchEnterprises()
    }
  }, [showForm])

  const fetchEnterprises = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/public/enterprises')
      console.log('Enterprises loaded:', response.data)
      setEnterprises(response.data || [])
    } catch (err) {
      console.error('Error loading enterprises:', err)
      setError('⚠️ Erreur lors du chargement des entreprises. Vérifiez que le serveur est actif.')
    } finally {
      setLoading(false)
    }
  }

  // Filtrer les entreprises par ID ou nom
  const filteredEnterprises = enterprises.filter(ent => {
    const searchLower = searchTerm.toLowerCase().trim()
    if (!searchLower) return true
    
    return (
      String(ent.id).toLowerCase().includes(searchLower) ||
      (ent.nom || '').toLowerCase().includes(searchLower)
    )
  })

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="btn-primary"
      >
        Créer une Carte
      </button>
    )
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      if (selectedId.trim()) {
        window.location.href = `/join/${selectedId}`
      }
    }} className="demo-form">
      {error && (
        <div className="demo-form-error">
          ⚠️ {error.replace('⚠️ ', '')}
        </div>
      )}
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
          ⏳ Chargement des entreprises...
        </div>
      ) : enterprises.length > 0 ? (
        <>
          {/* Search Input */}
          <div>
            <label>🔍 Rechercher une entreprise</label>
            <input
              type="text"
              placeholder="Tapez l'ID ou le nom de l'entreprise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {/* Results List */}
          <div>
            {filteredEnterprises.length > 0 ? (
              <>
                <label>Sélectionner une entreprise ({filteredEnterprises.length})</label>
                <div className="demo-form-search-results">
                  {filteredEnterprises.map((ent) => (
                    <div
                      key={ent.id}
                      className={`demo-form-item ${selectedId === ent.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(ent.id)}
                    >
                      <div>
                        <div className="demo-form-item-name">{ent.nom}</div>
                        <div className="demo-form-item-id">ID: {ent.id}</div>
                      </div>
                      {selectedId === ent.id && <span>✓</span>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="demo-form-empty">
                🔍 Aucune entreprise ne correspond à "{searchTerm}"
              </div>
            )}
          </div>

          {/* Selection Confirmation */}
          {selectedId && (
            <div className="demo-form-selection">
              ✅ Entreprise sélectionnée: <strong>{enterprises.find(e => e.id === selectedId)?.nom}</strong>
            </div>
          )}

          {/* Action Buttons */}
          <div className="demo-form-buttons">
            <button 
              type="submit" 
              disabled={!selectedId}
              className="btn-primary"
            >
              ✅ Créer une Carte
            </button>
            <button
              type="button"
              className="btn-small-cancel"
              onClick={() => {
                setShowForm(false)
                setSearchTerm('')
                setSelectedId('')
                setError('')
              }}
            >
              ✕ Annuler
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="demo-form-empty">
            😐 Aucune entreprise disponible pour le moment
          </div>
          <button
            type="button"
            className="btn-small-cancel"
            onClick={() => {
              setShowForm(false)
              setSearchTerm('')
              setSelectedId('')
              setError('')
            }}
          >
            ✕ Retour
          </button>
        </>
      )}
    </form>
  )
}

export default Home
