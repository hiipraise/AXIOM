import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Star, ChevronLeft, Menu, X, BarChart2, MessageSquare, Megaphone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api'
import clsx from 'clsx'

const BANNER_H = 32

const NAV = [
  { to: '/admin',               label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/admin/analytics',     label: 'Analytics',     icon: BarChart2 },
  { to: '/admin/feedback',      label: 'Feedback',      icon: MessageSquare },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/users',         label: 'Users',         icon: Users },
  { to: '/admin/cvs',           label: 'All CVs',       icon: FileText },
  { to: '/admin/ratings',       label: 'Ratings',       icon: Star },
]

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const navigate = useNavigate()
  return (
    <>
      <div className="px-4 py-4 border-b border-ash-border">
        <span className="font-display text-sm font-bold text-ink">AXIOM Admin</span>
        <button
          onClick={() => { navigate('/dashboard'); onNav?.() }}
          className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink mt-1 transition-colors"
        >
          <ChevronLeft size={11} /> Back to app
        </button>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNav}
            className={({ isActive }) =>
              clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all',
                isActive ? 'bg-ink text-white font-medium' : 'text-ink-muted hover:bg-ash hover:text-ink')
            }
          >
            <Icon size={13} /> {label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false)

  const { data: ann } = useQuery({
    queryKey: ['announcement-active'],
    queryFn:  () => api.get('/announcements/active').then(r => r.data),
    staleTime: 60_000,
  })
  const bannerH = ann?.active ? BANNER_H : 0

  return (
    <div className="min-h-screen bg-ash flex">

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-52 bg-white border-r border-ash-border flex-col flex-shrink-0 fixed z-20"
        style={{ top: bannerH, bottom: 0 }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed left-0 right-0 z-30 bg-white border-b border-ash-border px-4 h-12 flex items-center justify-between"
        style={{ top: bannerH }}
      >
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

      <main
        className="flex-1 md:ml-52 overflow-auto"
        style={{ paddingTop: bannerH + 48 }} // 48 = h-12 mobile bar
      >
        <div className="md:-mt-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}