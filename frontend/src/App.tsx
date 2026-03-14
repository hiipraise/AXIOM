import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPage from './pages/auth/ForgotPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import CVEditorPage from './pages/cv/CVEditorPage'
import CVNewPage from './pages/cv/CVNewPage'
import PublicCVPage from './pages/public/PublicCVPage'
import PublicProfilePage from './pages/public/PublicProfilePage'
import AccountPage from './pages/dashboard/AccountPage'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCVs from './pages/admin/AdminCVs'
import AdminRatings from './pages/admin/AdminRatings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!['admin', 'superadmin', 'staff'].includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot" element={<ForgotPage />} />

      {/* Public CV pages */}
      <Route path="/cv/:username/:slug" element={<PublicCVPage />} />
      <Route path="/profile/:username" element={<PublicProfilePage />} />

      {/* Protected app */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="cv/new" element={<CVNewPage />} />
        <Route path="cv/:id" element={<CVEditorPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="cvs" element={<AdminCVs />} />
        <Route path="ratings" element={<AdminRatings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
