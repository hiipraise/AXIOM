import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { FileText, Plus, User, LogOut, Settings, LayoutDashboard, Shield } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import clsx from 'clsx'

export default function Layout() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const isAdmin = user && ['admin', 'superadmin', 'staff'].includes(user.role)

  return (
    <div className="min-h-screen bg-ash flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-ash-border flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-ash-border">
          <span className="font-display text-xl font-bold text-ink tracking-tight">AXIOM</span>
          <span className="block text-[10px] text-ink-muted font-mono tracking-widest mt-0.5">CV GENERATOR</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                isActive ? 'bg-ink text-white' : 'text-ink-muted hover:bg-ash hover:text-ink')
            }
          >
            <LayoutDashboard size={15} />
            Dashboard
          </NavLink>

          <button
            onClick={() => navigate('/cv/new')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-muted hover:bg-ash hover:text-ink transition-all"
          >
            <Plus size={15} />
            New CV
          </button>

          <NavLink
            to="/account"
            className={({ isActive }) =>
              clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                isActive ? 'bg-ink text-white' : 'text-ink-muted hover:bg-ash hover:text-ink')
            }
          >
            <Settings size={15} />
            Account
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                  isActive ? 'bg-ink text-white' : 'text-ink-muted hover:bg-ash hover:text-ink')
              }
            >
              <Shield size={15} />
              Admin
            </NavLink>
          )}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-ash-border">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink truncate">{user?.username}</p>
              <p className="text-[10px] text-ink-muted capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-xs text-ink-muted hover:text-red-600 transition-colors py-1">
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
