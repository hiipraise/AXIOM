import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CVData } from '../types'
import CVRenderer from './cv/CVRenderer'

interface PrintJob {
  cvData: CVData
  theme: string
  template: string
}

interface Props {
  printJob: PrintJob | null
  onDone: () => void
}

/**
 * Renders the CV directly into document.body (outside #root) via a portal.
 * This lets the @media print CSS do a clean:
 *   #root          { display: none }   ← hides the whole app shell
 *   #cv-print-frame { display: block }  ← shows only the CV
 *
 * Without the portal, #cv-print-frame is inside #root, so any attempt to
 * hide #root also hides the frame, and any visibility trick that works around
 * that leaves the app shell contributing height → blank extra pages.
 */
export default function PrintFrame({ printJob, onDone }: Props) {
  useEffect(() => {
    if (!printJob) return
    const t = setTimeout(() => {
      window.print()
      setTimeout(onDone, 500)
    }, 300)
    return () => clearTimeout(t)
  }, [printJob]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!printJob) return null

  return createPortal(
    <div id="cv-print-frame">
      <CVRenderer
        cvData={printJob.cvData}
        theme={printJob.theme}
        template={printJob.template}
      />
    </div>,
    document.body,
  )
}