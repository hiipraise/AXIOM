import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// ─── Ghost CV card — pure skeleton, no real data ─────────────────────────────
interface GhostCardProps {
  style: React.CSSProperties
  driftY: number
  duration: number
  delay: number
  rotate: number
}

function GhostCard({ style, driftY, duration, delay, rotate }: GhostCardProps) {
  return (
    <motion.div
      className="absolute w-44 bg-white border border-ash-border rounded-xl p-4 shadow-sm pointer-events-none"
      style={{ rotate, ...style }}
      animate={{ y: [0, -driftY, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-ash-border flex-shrink-0" />
        <div className="space-y-1 flex-1">
          <div className="h-2 bg-ash-border rounded-full w-3/4" />
          <div className="h-1.5 bg-ash-border/60 rounded-full w-1/2" />
        </div>
      </div>
      {/* Body lines */}
      <div className="space-y-1.5">
        <div className="h-1.5 bg-ash-border/70 rounded-full w-full" />
        <div className="h-1.5 bg-ash-border/50 rounded-full w-5/6" />
        <div className="h-1.5 bg-ash-border/40 rounded-full w-4/6" />
      </div>
      {/* Skill chips */}
      <div className="flex gap-1 mt-3">
        {[12, 16, 10].map((w, i) => (
          <div
            key={i}
            className="h-4 bg-ash-border/50 rounded"
            style={{ width: `${w * 4}px` }}
          />
        ))}
      </div>
    </motion.div>
  )
}

const CARDS: GhostCardProps[] = [
  { style: { left: '4%',  top: '10%' }, driftY: 14, duration: 5.8, delay: 0,    rotate: -5  },
  { style: { left: '18%', top: '52%' }, driftY: 10, duration: 7.2, delay: 1.1,  rotate: 3   },
  { style: { right: '4%', top: '8%'  }, driftY: 16, duration: 6.4, delay: 0.6,  rotate: 6   },
  { style: { right: '16%',top: '55%' }, driftY: 12, duration: 5.2, delay: 2.0,  rotate: -4  },
]

// ─── Section ─────────────────────────────────────────────────────────────────
export default function ExploreTeaserSection() {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="explore" className="relative py-24 px-5 bg-ash overflow-hidden">

      {/* Ghost cards — left/right edges, faded out toward centre */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          maskImage:
            'linear-gradient(to right, black 0%, transparent 30%, transparent 70%, black 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, black 0%, transparent 30%, transparent 70%, black 100%)',
        }}
      >
        {CARDS.map((card, i) => (
          <GhostCard key={i} {...card} />
        ))}
      </div>

      {/* Content */}
      <div className="relative max-w-5xl mx-auto text-center" ref={ref}>

        <motion.p
          className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          Community
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
          Browse public CVs from the AXIOM community. Get inspiration, see how
          others structure their experience, and share your own.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white text-sm font-medium rounded-xl hover:bg-ink-light transition-colors"
          >
            Explore public CVs
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight size={14} />
            </motion.span>
          </Link>
        </motion.div>

      </div>
    </section>
  )
}