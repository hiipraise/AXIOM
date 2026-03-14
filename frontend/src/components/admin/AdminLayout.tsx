import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Star, ChevronLeft } from 'lucide-react'
import clsx from 'clsx'

export default function AdminLayout() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-ash flex">
      <aside className="w-52 bg-white border-r border-ash-border flex flex-col">
        <div className="px-4 py-4 border-b border-ash-border">
          <span className="font-display text-sm font-bold text-ink">AXIOM Admin</span>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink mt-1 transition-colors">
            <ChevronLeft size={11} /> Back to app
          </button>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {[
            { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
            { to: '/admin/users', label: 'Users', icon: Users },
            { to: '/admin/cvs', label: 'All CVs', icon: FileText },
            { to: '/admin/ratings', label: 'Ratings', icon: Star },
          ].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all',
                isActive ? 'bg-ink text-white font-medium' : 'text-ink-muted hover:bg-ash hover:text-ink')}>
              <Icon size={13} />{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  )
}
