import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate, MotionValue } from 'framer-motion'
import { STEPS } from './data'

/**
 * Layout: 4 cards separated by 3 connector lines = 7 segments.
 * A single MotionValue `prog` runs 0 → 7 on loop.
 *
 * Segment map (each segment = 1 unit of prog):
 *   0 → card 0
 *   1 → connector 0-1
 *   2 → card 1
 *   3 → connector 1-2
 *   4 → card 2
 *   5 → connector 2-3
 *   6 → card 3
 */
const SEG   = STEPS.length * 2 - 1   // 7
const CYCLE = 5.6                     // seconds for one full loop

function useProg() {
  const prog = useMotionValue(0)
  useEffect(() => {
    const ctrl = animate(prog, SEG, {
      duration:   CYCLE,
      ease:       'linear',
      repeat:     Infinity,
      repeatType: 'loop',
    })
    return () => ctrl.stop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return prog
}

// ─── Connector: ink fills left → right as prog sweeps through segment s ──────
function ConnectorLine({
  segIndex,
  prog,
}: {
  segIndex: number
  prog: MotionValue<number>
}) {
  // scaleX goes 0 → 1 while prog moves from segIndex to segIndex+1
  const scaleX = useTransform(prog, [segIndex, segIndex + 1], [0, 1], { clamp: true })

  return (
    <div className="hidden lg:block absolute top-[1.75rem] left-full w-full h-[2px] z-0 bg-ash-border overflow-visible">
      {/* Filled portion */}
      <motion.div
        className="absolute inset-y-0 left-0 right-0 bg-ink origin-left"
        style={{ scaleX }}
      />
      {/* Travelling glow dot at the leading edge */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-ink shadow-[0_0_8px_3px_rgba(15,23,42,0.35)] -translate-x-1/2"
        style={{
          // left follows scaleX: 0% → 100%
          left: useTransform(scaleX, [0, 1], ['0%', '100%']),
          // fade in at start, fade out as it arrives at next card
          opacity: useTransform(scaleX, [0, 0.08, 0.88, 1], [0, 1, 1, 0]),
        }}
      />
    </div>
  )
}

// ─── Card: border + number glow while prog is near segment s ─────────────────
function StepCard({
  step,
  segIndex,
  prog,
  inView,
  cardOrder,
}: {
  step: (typeof STEPS)[0]
  segIndex: number  // 0, 2, 4, 6
  prog: MotionValue<number>
  inView: boolean
  cardOrder: number
}) {
  // Active window: half a segment before and after the card's segment centre
  const centre = segIndex + 0.5
  const borderOpacity = useTransform(
    prog,
    [centre - 0.9, centre - 0.2, centre + 0.2, centre + 0.9],
    [0, 1, 1, 0],
    { clamp: true }
  )
  const numColor = useTransform(
    prog,
    [centre - 0.9, centre - 0.2, centre + 0.2, centre + 0.9],
    ['#CBD5E1', '#0F172A', '#0F172A', '#CBD5E1'],
    { clamp: true }
  )

  return (
    <motion.div
      className="relative z-10 p-5 rounded-2xl bg-white border border-ash-border overflow-hidden"
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: cardOrder * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Glowing border overlay */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-ink"
        style={{ opacity: borderOpacity }}
      />

      <motion.div
        className="font-display font-bold text-3xl leading-none mb-3"
        style={{ color: numColor }}
      >
        {step.n}
      </motion.div>

      <p className="font-semibold text-sm text-ink mb-2">{step.title}</p>
      <p className="text-xs text-ink-muted leading-relaxed">{step.body}</p>
    </motion.div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────
export default function HowItWorksSection() {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prog   = useProg()

  // Segment indices:  card=even, connector=odd
  // card 0 → seg 0, connector 0 → seg 1, card 1 → seg 2, connector 1 → seg 3 …

  return (
    <section id="how-it-works" className="py-24 px-5">
      <div className="max-w-5xl mx-auto" ref={ref}>

        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3">
            Process
          </p>
          <h2 className="font-display font-bold text-3xl text-ink">
            From blank page to hired.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <div key={step.n} className="relative">
              {/* Connector to the right (odd segment = 2i+1) */}
              {i < STEPS.length - 1 && (
                <ConnectorLine segIndex={i * 2 + 1} prog={prog} />
              )}
              {/* Card (even segment = 2i) */}
              <StepCard
                step={step}
                segIndex={i * 2}
                prog={prog}
                inView={inView}
                cardOrder={i}
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}