import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { api } from '../api'

interface Announcement {
  id: string
  text: string
  type: 'info' | 'warning' | 'success'
  active: boolean
}

const TYPE_STYLES = {
  info:    'bg-ink text-white',
  warning: 'bg-amber-500 text-white',
  success: 'bg-emerald-600 text-white',
}

const FADE_FROM: Record<string, string> = {
  info:    'from-ink',
  warning: 'from-amber-500',
  success: 'from-emerald-600',
}

const dismissed = new Set<string>()

export default function AnnouncementBanner() {
  const [hidden, setHidden] = useState(false)

  const { data: ann } = useQuery<Announcement | null>({
    queryKey: ['announcement-active'],
    queryFn:  () => api.get('/announcements/active').then(r => r.data),
    staleTime: 60_000,
  })

  if (!ann || !ann.active || hidden || dismissed.has(ann.id)) return null

  const dismiss = () => { dismissed.add(ann.id); setHidden(true) }
  const bg      = TYPE_STYLES[ann.type] ?? TYPE_STYLES.info
  const fade    = FADE_FROM[ann.type]   ?? FADE_FROM.info

  // Repeat text enough times so the track is wide
  const repeated = Array(8).fill(ann.text).join('   ·   ')

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] flex items-center overflow-hidden ${bg}`}
      style={{ height: 32 }}
    >
      {/* Scrolling ticker */}
      <div className="flex-1 relative overflow-hidden" style={{ height: 32 }}>
        {/* Left fade */}
        <div className={`absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-r ${fade} to-transparent`} />
        {/* Right fade */}
        <div className={`absolute right-8 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-l ${fade} to-transparent`} />

        <motion.div
          className="flex items-center h-full whitespace-nowrap absolute left-0 top-0"
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            duration: 35,        // slow, readable scroll
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'loop',
          }}
        >
          {/* Two identical copies — when first slides to -50% it loops back to 0% seamlessly */}
          <span className="text-[11px] font-medium tracking-wide opacity-90 pr-0">{repeated}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;</span>
          <span className="text-[11px] font-medium tracking-wide opacity-90 pr-0">{repeated}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;</span>
        </motion.div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className="flex-shrink-0 w-8 flex items-center justify-center h-full opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={13} />
      </button>
    </div>
  )
}