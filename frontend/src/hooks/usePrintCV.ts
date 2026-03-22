import { useState, useCallback } from 'react'
import { cvApi, publicApi, api } from '../api'
import { renderCVtoHTML } from '../utils/renderCVtoHTML'
import toast from 'react-hot-toast'

/**
 * Generates PDFs by:
 * 1. Rendering CVRenderer into a hidden off-screen div (real browser layout)
 * 2. Capturing the innerHTML as a self-contained HTML document
 * 3. Sending it to the backend /api/export/html-pdf endpoint
 * 4. Backend runs Playwright (headless Chromium) → returns a real PDF
 *
 * Result: pixel-perfect match with the on-screen template, correct fonts,
 * correct spacing, works on all devices including iOS/Android.
 */

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function generateAndDownload(
  cvDataObj:  object,
  theme:      string,
  template:   string,
  filename:   string,
) {
  // Render the React component to HTML in the current browser
  const { cvData } = cvDataObj as any
  const html = await renderCVtoHTML(cvData, theme, template)

  // Send to backend for Playwright PDF generation
  const blob = await api.post(
    '/export/html-pdf',
    { html },
    { responseType: 'blob' },
  ).then(r => r.data as Blob)

  download(blob, filename)
}

export function usePrintCV() {
  const [isPrinting, setIsPrinting] = useState(false)
  const printJob = null
  const clearJob = useCallback(() => {}, [])

  const printCV = useCallback(async (cvId: string) => {
    setIsPrinting(true)
    const tid = toast.loading('Rendering PDF…')
    try {
      const cv   = await cvApi.get(cvId)
      const name = cv.data.personal_info.full_name || cv.owner_username
      const html = await renderCVtoHTML(
        cv.data,
        cv.theme    || 'minimal',
        cv.template || 'standard',
      )
      const blob = await api.post(
        '/export/html-pdf',
        { html },
        { responseType: 'blob' },
      ).then(r => r.data as Blob)
      download(blob, `${name}-${cv.title}.pdf`)
      toast.success('PDF downloaded', { id: tid })
    } catch (e) {
      console.error(e)
      toast.error('Could not generate PDF', { id: tid })
    } finally {
      setIsPrinting(false)
    }
  }, [])

  const printPublicCV = useCallback(async (username: string, slug: string) => {
    setIsPrinting(true)
    const tid = toast.loading('Rendering PDF…')
    try {
      const cv   = await publicApi.getCV(username, slug)
      const name = cv.data.personal_info.full_name || username
      const html = await renderCVtoHTML(
        cv.data,
        cv.theme    || 'minimal',
        cv.template || 'standard',
      )
      const blob = await api.post(
        '/export/html-pdf',
        { html },
        { responseType: 'blob' },
      ).then(r => r.data as Blob)
      download(blob, `${name}-${slug}.pdf`)
      toast.success('PDF downloaded', { id: tid })
    } catch (e) {
      console.error(e)
      toast.error('Could not generate PDF', { id: tid })
    } finally {
      setIsPrinting(false)
    }
  }, [])

  return { printCV, printPublicCV, printJob, clearJob, isPrinting }
}