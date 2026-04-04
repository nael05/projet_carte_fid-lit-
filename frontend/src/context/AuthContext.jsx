import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(localStorage.getItem('userRole') || null)
  const [loading, setLoading] = useState(true)
  const [isSuspended, setIsSuspended] = useState(false)

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

  // Synchroniser token avec localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
    }
  }, [token])

  // Synchroniser role avec localStorage
  useEffect(() => {
    if (role) {
      localStorage.setItem('userRole', role)
    } else {
      localStorage.removeItem('userRole')
    }
  }, [role])

  // Vérifier le statut pour les pro
  useEffect(() => {
    if (!token || role !== 'pro') return

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
        console.error('Erreur vérification statut:', err)
      }
    }

    checkStatus()
  }, [token, role])

  const login = (newToken, newRole = 'pro') => {
    setToken(newToken)
    setRole(newRole)
  }

  const logout = () => {
    setToken(null)
    setRole(null)
    setUser(null)
    setIsSuspended(false)
    // Nettoyer les données de session pour la sécurité
    localStorage.removeItem('deviceId')
    localStorage.removeItem('companyId')
    localStorage.removeItem('companyName')
  }

  const isAdmin = () => role === 'admin'
  const isPro = () => role === 'pro'
  const isAuthenticated = () => !!token

  const value = {
    token,
    user,
    role,
    loading,
    isSuspended,
    login,
    logout,
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