import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './Dashboard.css'

function AdminDashboard() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [created, setCreated] = useState(null)
  const [error, setError] = useState('')
  const [enterprises, setEnterprises] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/master-admin-secret')
    } else {
      loadEnterprises()
    }
  }, [navigate])

  const loadEnterprises = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/enterprises')
      console.log('✅ Entreprises chargées:', response.data)
      setEnterprises(response.data || [])
    } catch (err) {
      console.error('❌ Erreur chargement entreprises:', err.response?.status, err.response?.data || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCompany = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await api.post('/admin/create-company', { nom, email })
      setCreated(response.data)
      setNom('')
      setEmail('')
      // Recharger la liste
      setTimeout(() => loadEnterprises(), 1000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    }
  }

  const handleSuspend = async (companyId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir suspendre cette entreprise ?')) {
      return
    }

    try {
      console.log('🔍 Suspension - Envoi de:', { url: `/admin/suspend-company/${companyId}`, companyId })
      const response = await api.put(`/admin/suspend-company/${companyId}`)
      console.log('✅ Réponse suspension:', response.data)
      alert(response.data.message || 'Entreprise suspendue')
      loadEnterprises()
    } catch (err) {
      console.error('❌ Erreur suspension:', err.response?.status, err.response?.data || err.message)
      alert(err.response?.data?.error || 'Erreur lors de la suspension')
    }
  }

  const handleReactivate = async (companyId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir réactiver cette entreprise ?')) {
      return
    }

    try {
      await api.put(`/admin/reactivate-company/${companyId}`)
      alert('Entreprise réactivée')
      loadEnterprises()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
  }

  const handleDelete = async (companyId) => {
    if (!window.confirm('⚠️ ATTENTION: Cette action supprimera définitivement cette entreprise ET tous ses clients en cascade!\n\nÊtes-vous VRAIMENT sûr ?')) {
      return
    }

    try {
      await api.delete(`/admin/delete-company/${companyId}`)
      alert('Entreprise supprimée (suppression en cascade des clients)')
      loadEnterprises()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/master-admin-secret')
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Administration Master</h1>
        <button className="btn-secondary" onClick={handleLogout}>Déconnexion</button>
      </div>

      <div className="dashboard-content">
        {/* Section Création */}
        <div className="card">
          <h2>✏️ Créer une Nouvelle Entreprise</h2>
          <form onSubmit={handleCreateCompany}>
            <input
              type="text"
              placeholder="Nom de l'entreprise"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn-primary">Créer</button>
          </form>
        </div>

        {created && (
          <div className="card success">
            <h3>✓ Entreprise créée avec succès</h3>
            <p><strong>ID :</strong> {created.companyId}</p>
            <p><strong>Email :</strong> {created.email}</p>
            <p><strong>Mot de passe temporaire :</strong> <code>{created.temporaryPassword}</code></p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              L'entreprise devra changer ce mot de passe à la première connexion.
            </p>
          </div>
        )}

        {/* Section Gestion des Entreprises */}
        <div className="card">
          <h2>🏢 Gérer les Entreprises</h2>
          
          {loading ? (
            <p style={{ textAlign: 'center', color: '#999' }}>Chargement...</p>
          ) : enterprises.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>Aucune entreprise créée</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Statut</th>
                    <th>Créée le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enterprises.map((enterprise) => (
                    <tr key={enterprise.id}>
                      <td><strong>{enterprise.nom}</strong></td>
                      <td>{enterprise.email}</td>
                      <td>
                        <span className={`status-badge ${enterprise.statut}`}>
                          {enterprise.statut === 'actif' ? '🟢 Actif' : '🔴 Suspendu'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#999' }}>
                        {new Date(enterprise.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {enterprise.statut === 'actif' ? (
                            <button
                              className="btn-warning"
                              onClick={() => handleSuspend(enterprise.id)}
                              title="Suspendre cette entreprise"
                            >
                              ⏸️ Suspendre
                            </button>
                          ) : (
                            <button
                              className="btn-success"
                              onClick={() => handleReactivate(enterprise.id)}
                              title="Réactiver cette entreprise"
                            >
                              ✓ Réactiver
                            </button>
                          )}
                          <button
                            className="btn-danger"
                            onClick={() => handleDelete(enterprise.id)}
                            title="Supprimer définitivement (cascade)"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
            <p><strong>📊 Statut des Entreprises:</strong></p>
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              <li><strong>🟢 Actif:</strong> L'entreprise peut se connecter et utiliser le service</li>
              <li><strong>🔴 Suspendu:</strong> L'entreprise est bloquée (ses clients ne peuvent pas ajouter de points)</li>
              <li><strong>🗑️ Supprimer:</strong> ⚠️ Supprime l'entreprise ET tous ses clients (IRRÉVERSIBLE)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
