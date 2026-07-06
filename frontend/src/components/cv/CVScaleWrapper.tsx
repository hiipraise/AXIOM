import { useRef, useEffect, useState, ReactNode } from 'react'

/**
 * Renders CV content at its natural width (794 px) and scales it down
 * proportionally so it fits any container width without breaking the layout.
 * On very small screens (< ~436 px) a minimum scale floor is applied;
 * the wrapper switches to horizontal scrolling so users can pan to see cut-off edges.
 * Does NOT affect the print path — only used for on-screen display.
 */

const CV_NATURAL_WIDTH = 794
const MIN_SCALE = 0.55

export default function CVScaleWrapper({ children }: Props) {
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const contentRef    = useRef<HTMLDivElement>(null)
  const [scale, setScale]               = useState(1)
  const [isScrolling, setIsScrolling]   = useState(false)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current || !contentRef.current) return
      const available  = wrapperRef.current.offsetWidth
      const fitScale   = Math.min(1, available / CV_NATURAL_WIDTH)
      const newScale   = Math.max(MIN_SCALE, fitScale)
      setScale(newScale)
      setIsScrolling(fitScale < MIN_SCALE)
      setContentHeight(Math.ceil(contentRef.current.scrollHeight * newScale))
    }

    update()

    const ro = new ResizeObserver(update)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [children])

  if (isScrolling) {
    // On very narrow screens: render at natural scale and let the user scroll
    const naturalHeight = contentRef.current?.scrollHeight
    return (
      <div
        ref={wrapperRef}
        style={{
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: `${CV_NATURAL_WIDTH}px`,
            minHeight: naturalHeight ? `${naturalHeight}px` : 'auto',
          }}
        >
          {children}
          <p className="text-center text-[10px] text-ink-muted py-2">Scroll horizontally to see the full CV</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        overflow: 'hidden',
        height: contentHeight !== null ? `${contentHeight}px` : 'auto',
      }}
    >
      <div
        ref={contentRef}
        style={{
          width: `${CV_NATURAL_WIDTH}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}

interface Props {
  children: ReactNode
}