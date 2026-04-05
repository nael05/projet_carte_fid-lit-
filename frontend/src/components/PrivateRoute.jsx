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
  const { isAuthenticated, isPro, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Chargement...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/pro/login" replace />
  }

  if (!isPro()) {
    return <Navigate to="/" replace />
  }

  return element
}