import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { Plus, LogOut, Settings, LayoutDashboard, Shield, Compass, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/auth'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/explore',   label: 'Explore',   icon: Compass },
  { to: '/account',   label: 'Account',   icon: Settings },
]

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin  = user && ['admin', 'superadmin', 'staff'].includes(user.role)

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-ash-border">
        <Link to="/" onClick={onNav} className="font-display text-xl font-bold text-ink tracking-tight">
          AXIOM
        </Link>
        <span className="block text-[10px] text-ink-muted font-mono tracking-widest mt-0.5">
          CV GENERATOR
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNav}
            className={({ isActive }) =>
              clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                isActive ? 'bg-ink text-white' : 'text-ink-muted hover:bg-ash hover:text-ink')
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}

        <button
          onClick={() => { navigate('/cv/new'); onNav?.() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-muted hover:bg-ash hover:text-ink transition-all"
        >
          <Plus size={15} />
          New CV
        </button>

        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={onNav}
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

      {/* User */}
      <div className="px-4 py-4 border-t border-ash-border">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink truncate">{user?.username}</p>
            <p className="text-[10px] text-ink-muted capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-xs text-ink-muted hover:text-red-600 transition-colors py-1"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-ash flex">

      {/* ── Desktop sidebar — fixed, always visible ≥ md ── */}
      <aside className="hidden md:flex w-56 bg-white border-r border-ash-border flex-col fixed h-full z-20">
        <SidebarContent />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-ash-border px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-display text-lg font-bold text-ink tracking-tight">
          AXIOM
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-ink-muted hover:text-ink transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ── Mobile slide-in drawer ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="md:hidden fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              className="md:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col shadow-xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-ink-muted hover:text-ink transition-colors"
              >
                <X size={18} />
              </button>
              <SidebarContent onNav={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      {/* pt-14 on mobile offsets the fixed top bar; md:pt-0 + md:ml-56 restores desktop layout */}
      <main className="flex-1 md:ml-56 min-h-screen pt-14 md:pt-0">
        <Outlet />
      </main>

    </div>
  )
}