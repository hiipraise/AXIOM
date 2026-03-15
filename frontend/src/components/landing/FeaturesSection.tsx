import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Zap } from 'lucide-react'
import { FEATURES } from './data'

// ─── Icon that floats forever, no trigger needed ─────────────────────────────
function FloatingIcon({
  icon: Icon,
  floatDelay,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  floatDelay: number
}) {
  return (
    <div className="w-8 h-8 rounded-xl bg-ash flex items-center justify-center flex-shrink-0 mt-0.5">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: floatDelay,
        }}
      >
        <Icon size={14} className="text-ink" />
      </motion.div>
    </div>
  )
}

// ─── All words shown at once, one line sweeps left→right across all, loops ───
const BANNED_WORDS =
  'versatile, passionate, dynamic, results-driven, team player, detail-oriented, synergy, cutting-edge, leveraged'

function SweepingStrikethrough() {
  return (
    <span className="relative inline">
      <span className="text-white/50">{BANNED_WORDS}</span>

      {/* Line sweeps across the whole block, loops forever */}
      <motion.span
        aria-hidden
        className="absolute left-0 right-0 rounded-full bg-white/75 pointer-events-none"
        style={{ top: '50%', height: '1.5px', transformOrigin: 'left center' }}
        animate={{ scaleX: [0, 1, 1, 0] }}
        transition={{
          duration: 3,
          times: [0, 0.4, 0.75, 1],
          ease: ['easeOut', 'linear', 'easeIn'],
          repeat: Infinity,
          repeatDelay: 1.5,
        }}
      />
    </span>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────
export default function FeaturesSection() {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  // Flat list of all items across groups for a global float-delay index
  const allItems = FEATURES.flatMap(g => g.items)

  return (
    <section id="features" className="py-24 px-5 bg-ash">
      <div className="max-w-5xl mx-auto" ref={ref}>

        {/* Heading */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3">
            Features
          </p>
          <h2 className="font-display font-bold text-3xl text-ink">
            Built for honesty, not hype.
          </h2>
          <p className="text-ink-muted mt-3 max-w-md mx-auto text-sm leading-relaxed">
            Every feature is designed around one principle: your CV should reflect
            what you actually did, with precision that recruiters trust.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(({ group, items }, cardIndex) => (
            <motion.div
              key={group}
              className="bg-white rounded-2xl border border-ash-border p-6 space-y-4"
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: cardIndex * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">
                {group}
              </p>
              {items.map(({ icon, label, desc }) => {
                // stable offset so icons are never in sync with each other
                const globalIndex = allItems.findIndex(i => i.label === label)
                const floatDelay  = globalIndex * 0.28

                return (
                  <div key={label} className="flex items-start gap-3">
                    <FloatingIcon icon={icon} floatDelay={floatDelay} />
                    <div>
                      <p className="text-sm font-medium text-ink">{label}</p>
                      <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          ))}
        </div>

        {/* Zero-cliché banner */}
        <motion.div
          className="mt-8 bg-ink text-white rounded-2xl p-6 flex items-start gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <motion.div
              animate={{ rotate: [0, -15, 15, -8, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
            >
              <Zap size={16} />
            </motion.div>
          </div>

          <div>
            <p className="font-semibold text-sm">The Zero-Cliché Policy</p>
            <p className="text-white/70 text-xs mt-1 leading-relaxed">
              AXIOM's AI is instructed to never write:{' '}
              <SweepingStrikethrough />
              {' '}— or 20+ other banned phrases. Every word earns its place.
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  )
}