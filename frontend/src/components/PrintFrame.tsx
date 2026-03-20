import { useEffect } from 'react'
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

export default function PrintFrame({ printJob, onDone }: Props) {
  // This useEffect fires AFTER the CVRenderer has been committed to the DOM,
  // so window.print() always has content to print.
  useEffect(() => {
    if (!printJob) return
    const t = setTimeout(() => {
      window.print()
      setTimeout(onDone, 500)
    }, 300) // 300ms lets fonts and layout settle
    return () => clearTimeout(t)
  }, [printJob]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!printJob) return null

  return (
    <div id="cv-print-frame">
      <CVRenderer
        cvData={printJob.cvData}
        theme={printJob.theme}
        template={printJob.template}
      />
    </div>
  )
}