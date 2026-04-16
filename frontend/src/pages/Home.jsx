import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutGrid, Users, CreditCard, Search, CheckCircle2, 
  Loader2, AlertTriangle, X, Shield, Zap, Smartphone, 
  ArrowRight, Star, Globe, ChevronRight 
} from 'lucide-react'
import api from '../api'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }, [])

  return (
    <div className="home-luxe-container">
      {/* Background Decorative Elements */}
      <div className="luxe-bg-glow"></div>
      <div className="luxe-bg-mesh"></div>

      {/* NAVBAR */}
      <nav className="luxe-navbar">
        <div className="navbar-content">
          <div className="logo-placeholder">
            {/* Logo will be here later */}
            <div className="placeholder-box">
              <Zap size={20} fill="currentColor" />
            </div>
            <span className="brand-name">Fidelyz</span>
          </div>
          <div className="navbar-actions">
            <button onClick={() => navigate('/pro/login')} className="btn-nav-glass">
              Espace Pro
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-badge">
          <Star size={14} /> <span>La Fidélité 2.0 est arrivée</span>
        </div>
        <h1 className="hero-title">
          Réinventez la Fidélité <br />
          <span className="gradient-text">avec le Digital</span>
        </h1>
        <p className="hero-subtitle">
          Transformez l'expérience de vos clients avec des cartes dématérialisées intelligentes, 
          directement intégrées dans Apple & Google Wallet.
        </p>
        <div className="hero-ctas">
          <button onClick={() => navigate('/pro/login')} className="btn-luxe-primary">
            Accédez à mon espace pro <ArrowRight size={18} />
          </button>
          <a href="#access" className="btn-luxe-secondary">Voir les solutions</a>
        </div>
      </section>

      {/* MODERN FEATURES SECTION */}
      <section className="features-showcase">
        <div className="feature-item">
          <div className="feat-icon"><Smartphone size={24} /></div>
          <h3>Compatible Wallet</h3>
          <p>S'ajoute en un clic sur iPhone et Android sans application.</p>
        </div>
        <div className="feature-item">
          <div className="feat-icon"><Zap size={24} /></div>
          <h3>Scan Instantané</h3>
          <p>Attribution de points ultra-rapide via QR Code sécurisé.</p>
        </div>
        <div className="feature-item">
          <div className="feat-icon"><Globe size={24} /></div>
          <h3>Accès Partout</h3>
          <p>Gérez votre commerce depuis n'importe quel appareil.</p>
        </div>
      </section>

      {/* ACCESS SECTION (The 3 Pillars) */}
      <section id="access" className="access-section">
        <div className="section-intro">
          <h2>Nos Solutions d'Accès</h2>
          <p>Une interface optimisée pour chaque acteur de votre écosystème.</p>
        </div>

        <div className="grid-piliers">
          {/* Admin Role */}
          <div className="pilier-card glass-card">
            <div className="pilier-header">
              <LayoutGrid size={32} />
              <h3>Master Admin</h3>
            </div>
            <p>Pilotage global du SaaS et gestion des entreprises partenaires.</p>
            <ul className="pilier-list">
              <li><CheckCircle2 size={16} /> Gestion multi-société</li>
              <li><CheckCircle2 size={16} /> Monitoring système</li>
              <li><CheckCircle2 size={16} /> Audit & Sécurité</li>
            </ul>
            <button onClick={() => navigate('/master-admin-secret')} className="btn-card-action">
              Entrée Master <ChevronRight size={18} />
            </button>
          </div>

          {/* Pro Role */}
          <div className="pilier-card glass-card active-border">
            <div className="pilier-header border-pro">
              <Users size={32} />
              <h3>Tableau de Bord Pro</h3>
            </div>
            <p>Outils complets pour commerçants souhaitant booster leur rétention.</p>
            <ul className="pilier-list">
              <li><CheckCircle2 size={16} /> Scan QR Premium</li>
              <li><CheckCircle2 size={16} /> Customisation Wallet</li>
              <li><CheckCircle2 size={16} /> Base de données client</li>
            </ul>
            <button onClick={() => navigate('/pro/login')} className="btn-card-action primary">
              Se Connecter <ChevronRight size={18} />
            </button>
          </div>

          {/* Client Role */}
          <div className="pilier-card glass-card">
            <div className="pilier-header">
              <CreditCard size={32} />
              <h3>Espace Client</h3>
            </div>
            <p>Accès public pour la création rapide de cartes de fidélité.</p>
            <div className="client-demo-wrapper">
              <DemoClientAccess />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="luxe-footer">
        <div className="footer-line"></div>
        <div className="footer-content">
          <div className="footer-brand">
            <span className="brand-name">Fidelyz</span>
            <p>La référence du Wallet Loyalty</p>
          </div>
          <div className="footer-copy">
            &copy; 2026 Fidelyz S.A.S. • Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  )
}

function DemoClientAccess() {
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [enterprises, setEnterprises] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (showForm && enterprises.length === 0) {
      fetchEnterprises()
    }
  }, [showForm])

  const fetchEnterprises = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/public/enterprises')
      let data = response.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = data.value || []
      }
      setEnterprises(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Serveur indisponible')
    } finally {
      setLoading(false)
    }
  }

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
      <button onClick={() => setShowForm(true)} className="btn-client-start">
        Créer ma carte maintenant
      </button>
    )
  }

  return (
    <div className="demo-form-luxe">
      <div className="demo-form-header">
        <button onClick={() => setShowForm(false)} className="back-link"><X size={16} /></button>
        <h4>Rechercher un commerce</h4>
      </div>
      
      {loading ? (
        <div className="loading-state"><Loader2 size={24} className="spin" /></div>
      ) : (
        <>
          <div className="search-field-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Nom du commerce..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="enterprises-scroll">
            {filteredEnterprises.map((ent) => (
              <div
                key={ent.id}
                className={`ent-item ${selectedId === ent.id ? 'active' : ''}`}
                onClick={() => setSelectedId(ent.id)}
              >
                <span>{ent.nom}</span>
                {selectedId === ent.id && <CheckCircle2 size={16} />}
              </div>
            ))}
            {filteredEnterprises.length === 0 && <p className="no-result">Aucun commerce trouvé</p>}
          </div>

          {selectedId && (
            <button 
              onClick={() => window.location.href = `/join/${selectedId}`}
              className="btn-join-final"
            >
              C'est parti !
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default Home
