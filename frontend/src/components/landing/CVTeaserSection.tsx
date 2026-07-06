import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Shield } from 'lucide-react'

export default function CVTeaserSection() {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="relative py-24 px-5 bg-white overflow-hidden">
      <div className="relative max-w-5xl mx-auto text-center" ref={ref}>

        <motion.p
          className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          Discover
        </motion.p>

        <motion.h2
          className="font-display font-bold text-3xl text-ink mb-4"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          See real CVs from real people.
        </motion.h2>

        <motion.p
          className="text-ink-muted text-sm max-w-md mx-auto mb-8 leading-relaxed"
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          Browse public CVs from the AXIOM community. Search by role, skill, or industry — each CV
          respects its owner's privacy settings.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            to="/cvs/browse"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white text-sm font-medium rounded-xl hover:bg-ink-light transition-colors"
          >
            Browse public CVs
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight size={14} />
            </motion.span>
          </Link>
        </motion.div>

        {/* Trust note */}
        <motion.div
          className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-ink-muted"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.45, delay: 0.35 }}
        >
          <Shield size={12} />
          Every CV shown respects the owner's privacy controls
        </motion.div>
      </div>
    </section>
  )
}
