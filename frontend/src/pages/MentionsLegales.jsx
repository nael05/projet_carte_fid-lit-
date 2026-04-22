import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react'
import './MentionsLegales.css'

function MentionsLegales() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }

    api.get('/settings/mentions-legales')
      .then(res => setContent(res.data.content))
      .catch(() => setError('Impossible de charger les mentions légales.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="ml-page">
      <div className="ml-bg-glow" />

      <nav className="ml-navbar">
        <Link to="/" className="ml-back-btn">
          <ArrowLeft size={18} /> Retour à l'accueil
        </Link>
        <span className="ml-navbar-brand">Fidelyz</span>
      </nav>

      <main className="ml-container">
        {loading && (
          <div className="ml-state">
            <Loader2 size={32} className="spin" />
            <p>Chargement…</p>
          </div>
        )}

        {error && !loading && (
          <div className="ml-state ml-error">
            <AlertTriangle size={32} />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <article
            className="ml-article"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </main>

      <footer className="ml-footer">
        <span>&copy; {new Date().getFullYear()} Fidelyz S.A.S.</span>
        <Link to="/">Accueil</Link>
      </footer>
    </div>
  )
}

export default MentionsLegales
