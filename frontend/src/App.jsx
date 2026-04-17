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
import Join from './pages/Join'
import ForgotPassword from './pages/ForgotPassword'
import PublicResetPassword from './pages/PublicResetPassword'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Client - Create Card */}
          <Route path="/join/:empresaId" element={<Join />} />

          {/* Master Admin */}
          <Route path="/master-admin-secret" element={<AdminLogin />} />
          <Route path="/master-admin-secret/dashboard" element={<PrivateAdminRoute element={<AdminDashboard />} />} />

          {/* Pro */}
          <Route path="/pro/login" element={<ProLogin />} />
          <Route path="/pro/forgot-password" element={<ForgotPassword />} />
          <Route path="/password-recovery" element={<PublicResetPassword />} />
          <Route path="/pro/secure-password" element={<ProResetPassword />} />
          <Route path="/pro/dashboard" element={<PrivateProRoute element={<ProDashboard />} />} />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App