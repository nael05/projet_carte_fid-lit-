import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const axiosInstance = axios.create({
  baseURL: API_URL,
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const deviceId = localStorage.getItem('deviceId')
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Ajouter le deviceId pour les vérifications de session
  if (deviceId) {
    config.headers['X-Device-Id'] = deviceId
  }
  
  return config
})

// Handle 401 errors (expired/invalid session)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expirée - nettoyer et rediriger
      // Stocker le role AVANT de le supprimer
      const userRole = localStorage.getItem('userRole')
      
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
      localStorage.removeItem('deviceId')
      localStorage.removeItem('companyId')
      localStorage.removeItem('companyName')
      
      // Rediriger vers login approprié
      if (userRole === 'admin') {
        window.location.href = '/master-admin-secret'
      } else {
        window.location.href = '/pro/login'
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
