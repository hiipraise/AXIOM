import { useRef, useEffect, useState, ReactNode } from 'react'

/**
 * Renders CV content at its natural width (700 px) and scales it down
 * proportionally so it fits any container width without breaking the layout.
 * Does NOT affect the print path — only used for on-screen display.
 */

const CV_NATURAL_WIDTH = 700

interface Props {
  children: ReactNode
}

export default function CVScaleWrapper({ children }: Props) {
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const contentRef    = useRef<HTMLDivElement>(null)
  const [scale, setScale]               = useState(1)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current || !contentRef.current) return
      const available = wrapperRef.current.offsetWidth
      const newScale  = Math.min(1, available / CV_NATURAL_WIDTH)
      setScale(newScale)
      // After CSS scale the visual height shrinks — adjust wrapper height so
      // the surrounding scroll container sees the correct scrollable height.
      setContentHeight(Math.ceil(contentRef.current.scrollHeight * newScale))
    }

    update()

    const ro = new ResizeObserver(update)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [children])

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        overflow: 'hidden',
        // Hold the scaled height so parent scrollbars work correctly
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