import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * PrivateRoute - Protège les pages en vérifiant l'authentification
 * - Si pas authentifié → redirige vers login
 * - Si role ne correspond pas → redirige vers home
 */
export function PrivateAdminRoute({ element }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Chargement...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/master-admin-secret" replace />
  }

  if (!isAdmin()) {
    return <Navigate to="/" replace />
  }

  return element
}

export function PrivateProRoute({ element }) {
  const { isAuthenticated, isPro, loading, mustChangePassword } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Chargement...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/pro/login" replace />
  }

  if (!isPro()) {
    return <Navigate to="/" replace />
  }

  // 🔐 Forcer le changement de mot de passe si must_change_password = true
  // Sauf si on est déjà sur la page de changement de mot de passe
  if (mustChangePassword === true && window.location.pathname !== '/pro/secure-password') {
    console.warn('⚠️ Changement de mot de passe obligatoire - Redirection...')
    return <Navigate to="/pro/secure-password" state={{ firstTime: true }} replace />
  }

  return element
}