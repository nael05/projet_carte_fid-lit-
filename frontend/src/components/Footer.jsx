import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer-line" />
      <div className="site-footer-content">
        <span className="site-footer-brand">Fidelyz</span>
        <span className="site-footer-copy">
          &copy; {year} Fidelyz S.A.S. &mdash; Tous droits réservés.
        </span>
        <Link to="/mentions-legales" className="site-footer-link">
          Mentions légales
        </Link>
      </div>
    </footer>
  )
}

export default Footer
