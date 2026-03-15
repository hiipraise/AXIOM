import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Star, ChevronLeft, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/auth'
import clsx from 'clsx'

const NAV = [
  { to: '/admin',         label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users',   label: 'Users',     icon: Users },
  { to: '/admin/cvs',     label: 'All CVs',   icon: FileText },
  { to: '/admin/ratings', label: 'Ratings',   icon: Star },
]

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const navigate   = useNavigate()
  const { clearAuth } = useAuthStore()

  const handleBackToApp = () => {
    navigate('/dashboard')
    onNav?.()
  }

  return (
    <>
      <div className="px-4 py-4 border-b border-ash-border">
        <span className="font-display text-sm font-bold text-ink">AXIOM Admin</span>
        <button
          onClick={handleBackToApp}
          className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink mt-1 transition-colors"
        >
          <ChevronLeft size={11} /> Back to app
        </button>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNav}
            className={({ isActive }) =>
              clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all',
                isActive ? 'bg-ink text-white font-medium' : 'text-ink-muted hover:bg-ash hover:text-ink')
            }
          >
            <Icon size={13} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-ash flex">
      <aside className="hidden md:flex w-52 bg-white border-r border-ash-border flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-ash-border px-4 h-12 flex items-center justify-between">
        <span className="font-display text-sm font-bold text-ink">AXIOM Admin</span>
        <button onClick={() => setOpen(true)} className="p-2 text-ink-muted hover:text-ink">
          <Menu size={18} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="md:hidden fixed top-0 left-0 h-full w-64 bg-white z-50 flex flex-col shadow-xl"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1.5 text-ink-muted hover:text-ink">
                <X size={16} />
              </button>
              <SidebarContent onNav={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-auto pt-12 md:pt-0">
        <Outlet />
      </main>
    </div>
  )
}