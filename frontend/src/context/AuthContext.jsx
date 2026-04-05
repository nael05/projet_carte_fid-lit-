import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(localStorage.getItem('userRole') || null)
  const [loading, setLoading] = useState(true)
  const [isSuspended, setIsSuspended] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  // Récupérer token et role au chargement
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedRole = localStorage.getItem('userRole')
    
    if (storedToken) {
      setToken(storedToken)
      setRole(storedRole || 'pro') // Default to pro if not specified
    }
    
    setLoading(false)
  }, [])

  // Synchroniser token with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
    }
  }, [token])

  // Synchroniser role with localStorage
  useEffect(() => {
    if (role) {
      localStorage.setItem('userRole', role)
    } else {
      localStorage.removeItem('userRole')
    }
  }, [role])

  // Vérifier le statut pour les pro (une seule fois après authentification)
  useEffect(() => {
    if (!token || role !== 'pro' || loading) return

    // Utiliser une ref pour ne faire ça qu'une fois
    let isMounted = true

    const checkStatus = async () => {
      try {
        const response = await api.get('/pro/status')
        if (isMounted) {
          if (response.data.statut === 'suspendu') {
            setIsSuspended(true)
          } else {
            setIsSuspended(false)
          }
          setUser(response.data)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Erreur vérification statut:', err)
          // Ne pas bloquer l'application en cas d'erreur
          setIsSuspended(false)
        }
      }
    }

    // Laisser un délai d'une seconde après authentification avant de vérifier le statut
    const timer = setTimeout(checkStatus, 1000)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [token, role, loading])

  const login = (newToken, newRole = 'pro', mustChange = false) => {
    setToken(newToken)
    setRole(newRole)
    setMustChangePassword(Boolean(mustChange))  // 🔐 Stocker le flag changePassword
  }

  const updateMustChangePassword = (value) => {
    setMustChangePassword(Boolean(value))  // 🔐 Mettre à jour le flag
  }

  const logout = () => {
    setToken(null)
    setRole(null)
    setUser(null)
    setIsSuspended(false)
    setMustChangePassword(false)  // 🔐 Réinitialiser le flag
    // Nettoyer les données de session pour la sécurité
    localStorage.removeItem('deviceId')
    localStorage.removeItem('companyId')
    localStorage.removeItem('companyName')
  }

  const isAdmin = () => role === 'admin'
  const isPro = () => role === 'pro'
  // isAuthenticated est maintenant une valeur booléenne, pas une fonction
  const isAuthenticated = !!token

  const value = {
    token,
    user,
    role,
    loading,
    isSuspended,
    mustChangePassword,  // 🔐 Flag pour forcer le changement de mot de passe
    login,
    logout,
    updateMustChangePassword,  // 🔐 Fonction pour mettre à jour le flag
    isAdmin,
    isPro,
    isAuthenticated,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}