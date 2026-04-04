import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [user, setUser] = useState(null)
  const [isSuspended, setIsSuspended] = useState(false)
  const [loading, setLoading] = useState(false)

  // Récupérer le token depuis localStorage au chargement
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
    }
  }, [])

  // Sauvegarder le token dans localStorage quand il change
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }, [token])

  // Vérifier le statut de l'entreprise toutes les 30 secondes
  useEffect(() => {
    if (!token) return

    const checkStatus = async () => {
      try {
        const response = await api.get('/pro/status')
        if (response.data.statut === 'suspendu') {
          setIsSuspended(true)
        } else {
          setIsSuspended(false)
        }
        setUser(response.data)
      } catch (err) {
        console.error('Erreur de vérification du statut:', err)
      }
    }

    // Vérifier immédiatement
    checkStatus()

    // Puis vérifier périodiquement
    const interval = setInterval(checkStatus, 30000) // 30 secondes

    return () => clearInterval(interval)
  }, [token])

  // Vérifier la visibilité de l'onglet et revalider le token
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // L'onglet redevient visible
        console.log('Onglet redevenu visible, vérification du token...')
        if (token) {
          verifyToken()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [token])

  const verifyToken = useCallback(async () => {
    if (!token) return false

    try {
      // Faire un appel simple pour vérifier que le token est toujours valide
      const response = await api.get('/pro/status')
      if (response.data.statut === 'suspendu') {
        setIsSuspended(true)
      } else {
        setIsSuspended(false)
      }
      setUser(response.data)
      return true
    } catch (err) {
      // Token expiré ou invalide
      logout()
      return false
    }
  }, [token])

  const login = (newToken, userData) => {
    setToken(newToken)
    setUser(userData)
    setIsSuspended(userData?.statut === 'suspendu')
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setIsSuspended(false)
    localStorage.removeItem('token')
  }

  const value = {
    token,
    user,
    isSuspended,
    loading,
    login,
    logout,
    verifyToken,
    isAuthenticated: !!token
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider')
  }
  return context
}
