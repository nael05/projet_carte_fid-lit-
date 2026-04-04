import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PrivateAdminRoute, PrivateProRoute } from './components/PrivateRoute'
import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ProLogin from './pages/ProLogin'
import ProResetPassword from './pages/ProResetPassword'
import ProDashboard from './pages/ProDashboard'
import JoinWallet from './pages/JoinWallet'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Master Admin */}
          <Route path="/master-admin-secret" element={<AdminLogin />} />
          <Route path="/master-admin-secret/dashboard" element={<PrivateAdminRoute element={<AdminDashboard />} />} />

          {/* Pro */}
          <Route path="/pro/login" element={<ProLogin />} />
          <Route path="/pro/reset-password" element={<ProResetPassword />} />
          <Route path="/pro/dashboard" element={<PrivateProRoute element={<ProDashboard />} />} />

          {/* Public */}
          <Route path="/join/:entrepriseId" element={<JoinWallet />} />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App