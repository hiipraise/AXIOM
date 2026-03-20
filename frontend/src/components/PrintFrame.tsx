/**
 * PrintFrame
 *
 * Sits at the root of the app (inside App.tsx).
 * Invisible normally. During window.print() the @media print CSS in
 * index.css hides everything EXCEPT #cv-print-frame, so the PDF
 * contains only the CV content.
 *
 * Must be rendered by the component that calls usePrintCV so they
 * share the same state. Pass the printJob from usePrintCV as a prop.
 */
import { CVData } from '../types'
import CVRenderer from './cv/CVRenderer'

interface PrintJob {
  cvData: CVData
  theme: string
  template: string
}

interface Props {
  printJob: PrintJob | null
}

export default function PrintFrame({ printJob }: Props) {
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