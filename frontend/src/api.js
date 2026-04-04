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
  
  // 🆕 Ajouter le deviceId pour les vérifications de session
  if (deviceId) {
    config.headers['X-Device-Id'] = deviceId
  }
  
  return config
})

export default axiosInstance
