import { Link } from 'react-router-dom'
import Logo from './Logo'
import SpellingWord from '../branding/SpellingWord'

export default function Footer() {
  return (
    <footer className="border-t border-ash-border px-5 py-8">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-xs text-ink-muted">— CV Generator</span>
        </div>

        <nav className="flex items-center gap-6 text-xs text-ink-muted">
          <Link to="/explore"  className="hover:text-ink transition-colors">Explore CVs</Link>
          <Link to="/login"    className="hover:text-ink transition-colors">Sign in</Link>
          <Link to="/register" className="hover:text-ink transition-colors">Register</Link>
        </nav>

        <p className="text-xs text-ink-muted flex items-center gap-[1ch]">
          <span>© {new Date().getFullYear()}</span>
          <SpellingWord />
          <span>.</span>
        </p>

      </div>
    </footer>
  )
}
