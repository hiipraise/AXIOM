import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, CheckCircle } from 'lucide-react'

// ─── Proof points ─────────────────────────────────────────────────────────────
const PROOF_POINTS = [
  'No email required',
  'PDF in seconds',
  'Version history',
  'Public profiles',
  'Zero-cliché AI',
  'ATS-safe output',
  'QR verification',
  'Share publicly',
  'Import any PDF',
  'Job description match',
]
// 4 copies → animate x 0 → -50% = seamless loop showing 2 copies at all times
const TICKER_ITEMS = [...PROOF_POINTS, ...PROOF_POINTS, ...PROOF_POINTS, ...PROOF_POINTS]

// ─── Single animated grid cell ────────────────────────────────────────────────
function GridCell({
  delay,
  duration,
  repeatDelay,
}: {
  delay: number
  duration: number
  repeatDelay: number
}) {
  return (
    <motion.div
      className="border-r border-b border-[#E2E8F0]"
      animate={{
        backgroundColor: [
          'rgba(15,23,42,0)',
          'rgba(15,23,42,0.05)',
          'rgba(15,23,42,0)',
        ],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay,
        ease: 'easeInOut',
      }}
    />
  )
}

// ─── Full animated grid background ───────────────────────────────────────────
function AnimatedGrid() {
  const COLS = 22
  const ROWS = 13

  // Stable random params — computed once, never on re-render
  const cells = useMemo(
    () =>
      Array.from({ length: COLS * ROWS }, (_, i) => ({
        id:          i,
        delay:       Math.random() * 10,
        duration:    1.2 + Math.random() * 3,
        repeatDelay: 1.5 + Math.random() * 9,
      })),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        maskImage:
          'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
      }}
    >
      <div
        className="w-full h-full grid border-l border-t border-[#E2E8F0]"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows:    `repeat(${ROWS}, 1fr)`,
        }}
      >
        {cells.map(c => (
          <GridCell
            key={c.id}
            delay={c.delay}
            duration={c.duration}
            repeatDelay={c.repeatDelay}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Blurred-edge infinite scroll ticker ─────────────────────────────────────
function ProofTicker() {
  return (
    <div
      className="relative mt-12 overflow-hidden"
      style={{
        maskImage:
          'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
      }}
    >
      <motion.div
        className="flex items-center gap-10 w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration:   28,
          repeat:     Infinity,
          ease:       'linear',
          repeatType: 'loop',
        }}
      >
        {TICKER_ITEMS.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-2 text-xs text-ink-muted flex-shrink-0 py-1 select-none"
          >
            <CheckCircle size={12} className="text-ink/30 flex-shrink-0" />
            {t}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ─── Shared framer motion variants ───────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y:       0,
    transition: {
      duration: 0.55,
      delay,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
}

const fadeIn = {
  hidden:  { opacity: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    transition: { duration: 0.6, delay },
  }),
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
export default function Hero() {
  return (
    <section className="relative pt-32 pb-24 px-5 overflow-hidden">

      {/* Animated grid */}
      <AnimatedGrid />

      {/* Ink blob */}
      <div
        className="absolute top-16 left-1/2 -translate-x-1/2 w-[480px] h-[300px] rounded-full opacity-[0.03] blur-3xl pointer-events-none"
        style={{ background: '#0F172A' }}
      />

      <div className="relative max-w-4xl mx-auto text-center">

        {/* Badge */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          custom={0}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ash border border-ash-border text-xs text-ink-muted mb-8"
        >
          {/* <Sparkles size={11} className="text-ink" /> */}
          AI-powered · ATS-safe · Zero-cliché
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.1}
          className="font-display font-bold text-ink leading-[1.08] tracking-tight mb-6"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
        >
          Your CV, exactly as
          <br />
          <span className="relative inline-block">
            sharp as you are.
            <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-ink rounded-full" />
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.22}
          className="text-ink-muted text-lg leading-relaxed max-w-xl mx-auto mb-10"
        >
          AXIOM writes truthful, evidence-based CVs that use real numbers,
          named tools, and concrete outcomes — never buzzwords.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.34}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            to="/register"
            className="flex items-center gap-2 px-6 py-3.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-ink-light transition-all shadow-lg shadow-ink/10 active:scale-95"
          >
            Get started free <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight size={14} />
            </motion.span>
          </Link>
          <Link
            to="/guest"
            className="flex items-center gap-2 px-6 py-3.5 bg-white text-ink text-sm font-medium rounded-xl border border-ash-border hover:bg-ash transition-all active:scale-95"
          >
            Try without account
          </Link>
        </motion.div>

        {/* Infinite proof ticker */}
        <ProofTicker />

      </div>
    </section>
  )
}