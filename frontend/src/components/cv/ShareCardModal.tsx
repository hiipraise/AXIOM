import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import { X, Download, Check, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import CVShareCard, { SHARE_CARD_W, SHARE_CARD_H } from './CVShareCard'

interface ShareCardModalProps {
  open: boolean
  onClose: () => void
  fullName: string
  jobTitle: string
  summary: string
  skills: string[]
  location: string
  publicUrl: string
  username: string
}

const SCALE = 0.35
const PREVIEW_W = Math.round(SHARE_CARD_W * SCALE)
const PREVIEW_H = Math.round(SHARE_CARD_H * SCALE)

export default function ShareCardModal({
  open,
  onClose,
  fullName,
  jobTitle,
  summary,
  skills,
  location,
  publicUrl,
  username,
}: ShareCardModalProps) {
  // Ref for the on-screen preview container (never mutated)
  const previewOuterRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const cardProps = { fullName, jobTitle, summary, skills, location, publicUrl, username }

  const captureCard = useCallback(async () => {
    setGenerating(true)

    // Create a detached clone at full resolution — never touches the visible preview
    const wrapper = document.createElement('div')
    wrapper.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: ${SHARE_CARD_W}px;
      height: ${SHARE_CARD_H}px;
    `
    document.body.appendChild(wrapper)

    const previewNode = previewOuterRef.current
    if (!previewNode) {
      document.body.removeChild(wrapper)
      setGenerating(false)
      return null
    }

    // Clone the outer container's DOM tree deeply and attach unhidden
    const clone = previewNode.cloneNode(true) as HTMLElement
    // Reset transforms on the clone so it renders at full size
    clone.style.width = SHARE_CARD_W + 'px'
    clone.style.height = SHARE_CARD_H + 'px'
    clone.style.transform = 'none'
    clone.style.borderRadius = '0'
    // Descendant inner div with the scale transform needs to be reset too
    const innerClone = clone.firstElementChild as HTMLElement | null
    if (innerClone) {
      innerClone.style.transform = 'none'
      innerClone.style.transformOrigin = '0 0'
      innerClone.style.width = SHARE_CARD_W + 'px'
      innerClone.style.height = SHARE_CARD_H + 'px'
    }

    wrapper.appendChild(clone)

    try {
      const dataUrl = await toPng(wrapper, {
        width: SHARE_CARD_W,
        height: SHARE_CARD_H,
        pixelRatio: 2,
        cacheBust: true,
      })
      return dataUrl
    } catch {
      toast.error('Could not generate card')
      return null
    } finally {
      document.body.removeChild(wrapper)
      setGenerating(false)
    }
  }, [])

  const generateAndDownload = useCallback(async () => {
    const dataUrl = await captureCard()
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `axiom-cv-${username || 'share-card'}.png`
    link.href = dataUrl
    link.click()
    toast.success('Share card downloaded')
  }, [captureCard, username])

  const copyToClipboard = useCallback(async () => {
    const dataUrl = await captureCard()
    if (!dataUrl) return
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      setCopied(true)
      toast.success('Card copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy card')
    }
  }, [captureCard])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ash-border">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-ink-muted" />
                <span className="font-semibold text-sm text-ink">Share card</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-ash"
              >
                <X size={16} />
              </button>
            </div>

            {/* Card preview — scaled version centered in the preview area */}
            <div className="p-5 bg-ash flex items-center justify-center overflow-hidden">
              <div
                ref={previewOuterRef}
                className="rounded-lg overflow-hidden shadow-lg"
                style={{
                  width: PREVIEW_W,
                  height: PREVIEW_H,
                }}
              >
                <div
                  style={{
                    width: SHARE_CARD_W,
                    height: SHARE_CARD_H,
                    transform: `scale(${SCALE})`,
                    transformOrigin: '0 0',
                  }}
                >
                  <CVShareCard {...cardProps} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-ash-border flex items-center gap-3">
              <button
                onClick={generateAndDownload}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-xl hover:bg-ink-light disabled:opacity-50 transition-colors"
              >
                <Download size={14} />
                {generating ? 'Generating…' : 'Download PNG'}
              </button>
              <button
                onClick={copyToClipboard}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 border border-ash-border text-ink text-sm font-medium rounded-xl hover:bg-ash disabled:opacity-50 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Download size={14} />}
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
              <div className="text-[11px] text-ink-muted ml-auto">
                1200 × 630 px · PNG
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
