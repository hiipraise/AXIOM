import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, X, ChevronLeft, Send, Check } from 'lucide-react'
import { api } from '../api'
import { useAuthStore } from '../store/auth'
import toast from 'react-hot-toast'

const AUTH_PATHS = ['/login', '/register', '/forgot']

const TYPES = [
  { id: 'rate',   label: 'Rate AXIOM'       },
  { id: 'keep',   label: 'Keep building'    },
  { id: 'add',    label: 'Add a feature'    },
  { id: 'remove', label: 'Remove a feature' },
  { id: 'other',  label: 'Other'            },
]

type Step = 'type' | 'form' | 'done'

// ─── Preload favicon once at module level ─────────────────────────────────────
// Creates one Image() when the JS module is first imported.
// All subsequent renders just reference the now-cached URL — zero extra requests.
const FAVICON_SRC = '/favicon.ico'
if (typeof window !== 'undefined') {
  const _preload   = new window.Image()
  _preload.src     = FAVICON_SRC
}

// ─── Typewriter callout ───────────────────────────────────────────────────────
const TYPED_TEXT = 'Rate '

function TypewriterCallout({ onDismiss }: { onDismiss: () => void }) {
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase]         = useState<'typing' | 'hold' | 'erasing'>('typing')

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    if (phase === 'typing') {
      if (displayed.length < TYPED_TEXT.length) {
        t = setTimeout(() => setDisplayed(TYPED_TEXT.slice(0, displayed.length + 1)), 80)
      } else {
        t = setTimeout(() => setPhase('hold'), 2400)
      }
    } else if (phase === 'hold') {
      t = setTimeout(() => setPhase('erasing'), 400)
    } else {
      if (displayed.length > 0) {
        t = setTimeout(() => setDisplayed(p => p.slice(0, -1)), 55)
      } else {
        t = setTimeout(() => setPhase('typing'), 800)
      }
    }
    return () => clearTimeout(t)
  }, [displayed, phase])

  const logoVisible = displayed.length === TYPED_TEXT.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{   opacity: 0, y: 8, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26, delay: 1.4 }}
      className="relative mb-1 pointer-events-auto"
    >
      <div className="relative flex items-center gap-2 bg-ink text-white px-4 py-2 rounded-2xl rounded-br-sm shadow-xl overflow-hidden">
        {/* Shimmer */}
        <motion.span
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
          animate={{ x: ['-130%', '230%'] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
        />

        <span className="relative z-10 flex items-center gap-2 min-w-[10px]">
          <span className="text-xs text-white/80 tracking-wide whitespace-pre">{displayed}</span>

          {/* Favicon — always rendered, just hidden via opacity to avoid unmount/remount requests */}
          <img
            src={FAVICON_SRC}
            alt="AXIOM"
            className="w-4 h-4 object-contain transition-all duration-200"
            style={{
              opacity:   logoVisible ? 1 : 0,
              transform: logoVisible ? 'scale(1)' : 'scale(0.6)',
            }}
          />

          {/* Cursor */}
          {phase !== 'hold' && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
              className="text-white/60 text-xs leading-none"
            >
              |
            </motion.span>
          )}
        </span>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="relative z-10 text-white/35 hover:text-white/80 transition-colors ml-1 flex-shrink-0"
        >
          <X size={11} />
        </button>
      </div>

      {/* Arrow tip */}
      <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-ink rotate-45 rounded-sm" />
    </motion.div>
  )
}

// ─── Widget ───────────────────────────────────────────────────────────────────
export default function FeedbackWidget() {
  const location = useLocation()
  const { user } = useAuthStore()

  const [callout, setCallout]       = useState(true)
  const [panel, setPanel]           = useState(false)
  const [step, setStep]             = useState<Step>('type')
  const [type, setType]             = useState('')
  const [rating, setRating]         = useState(0)
  const [hovered, setHovered]       = useState(0)
  const [message, setMessage]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (AUTH_PATHS.includes(location.pathname)) return null

  const reset      = () => { setStep('type'); setType(''); setRating(0); setMessage('') }
  const closePanel = () => { setPanel(false); reset() }

  const handleStarClick = () => {
    if (panel) { closePanel() }
    else       { setCallout(false); setPanel(true) }
  }

  const handleSubmit = async () => {
    if (type !== 'rate' && !message.trim()) return
    if (type === 'rate' && rating === 0) { toast.error('Pick a star rating'); return }
    setSubmitting(true)
    try {
      await api.post('/feedback', {
        type,
        rating:  type === 'rate' ? rating : null,
        message: message.trim(),
        page:    location.pathname,
        user_id: user ? user.id : null,
      })
      setStep('done')
    } catch {
      toast.error('Could not submit — try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-1.5 pointer-events-none">

      <AnimatePresence>
        {callout && !panel && (
          <TypewriterCallout onDismiss={() => setCallout(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: 10,  scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="pointer-events-auto mb-1 w-72 bg-white rounded-2xl border border-ash-border shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-ink">
              <div className="flex items-center gap-2">
                {step === 'form' && (
                  <button onClick={() => setStep('type')} className="text-white/60 hover:text-white transition-colors">
                    <ChevronLeft size={15} />
                  </button>
                )}
                <span className="text-sm font-semibold text-white">
                  {step === 'done' ? 'Thanks!' : 'Feedback'}
                </span>
              </div>
              <button onClick={closePanel} className="text-white/50 hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>

            {step === 'type' && (
              <div className="p-3 space-y-0.5">
                <p className="text-[11px] text-ink-muted px-2 py-1.5">What's on your mind?</p>
                {TYPES.map(t => (
                  <button key={t.id} onClick={() => { setType(t.id); setStep('form') }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-ink hover:bg-ash transition-colors">
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {step === 'form' && (
              <div className="p-4 space-y-3">
                <p className="text-xs font-medium text-ink">{TYPES.find(t => t.id === type)?.label}</p>
                {type === 'rate' && (
                  <div className="flex items-center gap-1.5">
                    {[1,2,3,4,5].map(n => (
                      <button key={n}
                        onMouseEnter={() => setHovered(n)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setRating(n)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star size={24} className={`transition-colors ${n <= (hovered || rating) ? 'text-amber-400 fill-amber-400' : 'text-ash-border'}`} />
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  placeholder={
                    type === 'rate'   ? 'Any thoughts? (optional)' :
                    type === 'keep'   ? 'What should we keep building?' :
                    type === 'add'    ? 'What feature would you love?' :
                    type === 'remove' ? "What's getting in the way?" :
                    'Tell us anything…'
                  }
                  className="w-full px-3 py-2 text-xs border border-ash-border rounded-xl focus:outline-none focus:border-ink resize-none text-ink placeholder:text-ink-muted/50"
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting || (type === 'rate' && rating === 0) || (type !== 'rate' && !message.trim())}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-ink text-white text-xs font-medium rounded-xl hover:bg-ink-light disabled:opacity-40 transition-colors"
                >
                  {submitting ? 'Sending…' : <><Send size={12} /> Send</>}
                </button>
              </div>
            )}

            {step === 'done' && (
              <div className="p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Check size={18} className="text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-ink mb-1">Got it, thanks!</p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Your feedback helps shape AXIOM. We read every message.
                </p>
                <button onClick={reset} className="mt-4 text-xs text-ink-muted hover:text-ink underline">
                  Send another
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleStarClick}
        whileTap={{ scale: 0.90 }}
        whileHover={{ scale: 1.1 }}
        className="pointer-events-auto w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center shadow-lg hover:bg-ink-light transition-colors"
      >
        <Star size={16} className={panel ? 'fill-white' : ''} />
      </motion.button>
    </div>
  )
}