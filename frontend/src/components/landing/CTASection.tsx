import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Star } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-24 px-5">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display font-bold text-4xl text-ink mb-4 leading-tight">
          Stop writing CVs.
          <br />
          Start getting hired.
        </h2>
        <p className="text-ink-muted text-sm mb-10 leading-relaxed">
          No email required. No subscription. Start building your CV in 30 seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/register"
            className="flex items-center gap-2 px-8 py-4 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-ink-light transition-all shadow-lg shadow-ink/10 active:scale-95"
          >
            Create your CV — it's free <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight size={15} />
            </motion.span>
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 text-sm text-ink-muted hover:text-ink rounded-xl border border-ash-border hover:bg-ash transition-all"
          >
            Sign in
          </Link>
        </div>

        {/* Stars — Mexican wave, each offset by 0.15s */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {[0, 1, 2, 3, 4].map(i => (
            <motion.div
              key={i}
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.15,
              }}
            >
              <Star size={14} className="text-amber-400 fill-amber-400" />
            </motion.div>
          ))}
          <span className="text-xs text-ink-muted ml-1">Trusted by professionals worldwide</span>
        </div>
      </div>
    </section>
  )
}