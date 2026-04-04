import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Grid, Users, Home as HomeIcon } from '../icons/Icons'
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
  const [demoId, setDemoId] = React.useState('')

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
      if (demoId.trim()) {
        window.location.href = `/join/${demoId}`
      }
    }} className="demo-form">
      <input
        type="text"
        placeholder="ID entreprise (ex: UUID)"
        value={demoId}
        onChange={(e) => setDemoId(e.target.value)}
        required
      />
      <button type="submit" className="btn-small">Aller</button>
      <button
        type="button"
        className="btn-small-cancel"
        onClick={() => {
          setShowForm(false)
          setDemoId('')
        }}
      >
        Annuler
      </button>
    </form>
  )
}

export default Home
