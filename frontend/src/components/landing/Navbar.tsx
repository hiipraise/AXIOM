import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ArrowRight, X, Menu } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAnnouncement } from '../../context/announcement'
import Logo from './Logo'
import { FEATURES } from './data'

const ALL_ITEMS = FEATURES.flatMap(g => g.items)

export default function Navbar() {
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [scrolled, setScrolled]         = useState(false)
  const dropdownRef                     = useRef<HTMLDivElement>(null)
  const { bannerH }                     = useAnnouncement()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setFeaturesOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-sm border-b border-ash-border shadow-sm' : 'bg-transparent'
      }`}
      style={{ top: bannerH, transition: 'top 0.28s cubic-bezier(0.4,0,0.2,1)' }}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5"><Logo /></Link>

        <nav className="hidden md:flex items-center gap-1">
          <div ref={dropdownRef} className="relative">
            <button onClick={() => setFeaturesOpen(v => !v)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${featuresOpen ? 'bg-ash text-ink' : 'text-ink-muted hover:text-ink hover:bg-ash'}`}>
              Features
              <ChevronDown size={14} className={`transition-transform ${featuresOpen ? 'rotate-180' : ''}`} />
            </button>
            {featuresOpen && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[640px] bg-white border border-ash-border rounded-2xl shadow-xl p-5 grid grid-cols-3 gap-4 animate-fade-in">
                {FEATURES.map(({ group, items }) => (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-3 px-1">{group}</p>
                    <div className="space-y-1">
                      {items.map(({ icon: Icon, label, desc }) => {
                        const floatDelay = ALL_ITEMS.findIndex(i => i.label === label) * 0.28
                        return (
                          <div key={label} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-ash transition-colors cursor-default">
                            <div className="w-7 h-7 rounded-lg bg-ink/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: floatDelay }}>
                                <Icon size={13} className="text-ink" />
                              </motion.div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-ink leading-tight">{label}</p>
                              <p className="text-[11px] text-ink-muted leading-snug mt-0.5">{desc}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div className="col-span-3 border-t border-ash-border pt-4 mt-1 flex items-center justify-between">
                  <p className="text-xs text-ink-muted">Zero-cliché AI writing · ATS-safe PDF · Version history</p>
                  <Link to="/register" onClick={() => setFeaturesOpen(false)} className="flex items-center gap-1.5 text-xs font-medium text-ink hover:underline">
                    Start free
                    <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}><ArrowRight size={11} /></motion.span>
                  </Link>
                </div>
              </div>
            )}
          </div>
          <a href="#how-it-works" className="px-4 py-2 text-sm text-ink-muted hover:text-ink hover:bg-ash rounded-lg transition-all">How it works</a>
          <a href="#explore"      className="px-4 py-2 text-sm text-ink-muted hover:text-ink hover:bg-ash rounded-lg transition-all">Explore CVs</a>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/login" className="px-4 py-2 text-sm text-ink-muted hover:text-ink rounded-lg transition-all">Sign in</Link>
          <Link to="/register" className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-light transition-all">
            Get started
            <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}><ArrowRight size={13} /></motion.span>
          </Link>
        </div>

        <button className="md:hidden p-2 text-ink-muted" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-ash-border px-5 py-4 space-y-1 animate-fade-in">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-2 px-3">Features</p>
          {FEATURES.flatMap(g => g.items).map(({ icon: Icon, label }, i) => (
            <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-muted">
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.28 }}><Icon size={13} /></motion.div>
              {label}
            </div>
          ))}
          <div className="border-t border-ash-border pt-3 mt-2 space-y-1">
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-ink-muted rounded-lg hover:bg-ash">How it works</a>
            <Link to="/explore"  onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-ink-muted rounded-lg hover:bg-ash">Explore CVs</Link>
            <Link to="/login"    onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-ink font-medium rounded-lg hover:bg-ash">Sign in</Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-3 py-2 bg-ink text-white text-sm font-medium rounded-lg text-center mt-2">Get started free</Link>
          </div>
        </div>
      )}
    </header>
  )
}