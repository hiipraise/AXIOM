import { useState, useCallback } from 'react'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { cvApi, publicApi } from '../api'
import { CVData } from '../types'
import CVRenderer from '../components/cv/CVRenderer'
import toast from 'react-hot-toast'

/**
 * Generates a PDF by:
 * 1. Rendering the CVRenderer component into a hidden off-screen div
 * 2. Capturing it with html2canvas
 * 3. Packing the canvas image into a jsPDF document
 * 4. Triggering a file download
 *
 * This is the only reliable approach that:
 * - Works on mobile (iOS Safari, Android Chrome)
 * - Preserves all template designs (atlas, horizon, pulse, grid, minimal-pro)
 * - Requires no backend template reimplementation
 */

const A4_WIDTH_MM  = 210
const A4_HEIGHT_MM = 297
const MM_TO_PX     = 3.7795275591  // 96 dpi

async function renderCVToPDF(
  cvData: CVData,
  theme: string,
  template: string,
  filename: string,
): Promise<void> {
  // Lazy-load heavy libs so they don't affect initial bundle
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  // Create a hidden container at exactly A4 width so templates lay out correctly
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: -9999px;
    width: ${Math.round(A4_WIDTH_MM * MM_TO_PX)}px;
    background: white;
    z-index: -1;
  `
  document.body.appendChild(container)

  // Render the React component into the container
  await new Promise<void>((resolve) => {
    const root = createRoot(container)
    root.render(
      createElement(CVRenderer, { cvData, theme, template }),
    )
    // Give React + fonts a tick to settle
    setTimeout(resolve, 400)
  })

  try {
    const canvas = await html2canvas(container, {
      scale: 2,           // retina quality
      useCORS: true,
      backgroundColor: '#ffffff',
      width: container.offsetWidth,
      height: container.scrollHeight,
      windowWidth: container.offsetWidth,
    })

    const imgData     = canvas.toDataURL('image/jpeg', 0.95)
    const imgWidthMM  = A4_WIDTH_MM
    const imgHeightMM = (canvas.height / canvas.width) * A4_WIDTH_MM

    // Build a multi-page PDF if content is taller than one A4 page
    const pageCount   = Math.ceil(imgHeightMM / A4_HEIGHT_MM)
    const pdf         = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    for (let i = 0; i < pageCount; i++) {
      if (i > 0) pdf.addPage()
      // Offset the image up by one page height per page so each page shows the next slice
      pdf.addImage(imgData, 'JPEG', 0, -(i * A4_HEIGHT_MM), imgWidthMM, imgHeightMM)
    }

    pdf.save(filename)
  } finally {
    document.body.removeChild(container)
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePrintCV() {
  const [isPrinting, setIsPrinting] = useState(false)

  // Kept for API compatibility with CVEditorPage / PublicCVPage
  const printJob = null
  const clearJob = useCallback(() => {}, [])

  const printCV = useCallback(async (cvId: string) => {
    setIsPrinting(true)
    const toastId = toast.loading('Generating PDF...')
    try {
      const cv = await cvApi.get(cvId)
      const name = cv.data.personal_info.full_name || cv.owner_username
      await renderCVToPDF(
        cv.data,
        cv.theme    || 'minimal',
        cv.template || 'standard',
        `${name}-${cv.title}.pdf`,
      )
      toast.success('PDF downloaded', { id: toastId })
    } catch (e) {
      console.error(e)
      toast.error('Could not generate PDF', { id: toastId })
    } finally {
      setIsPrinting(false)
    }
  }, [])

  const printPublicCV = useCallback(async (username: string, slug: string) => {
    setIsPrinting(true)
    const toastId = toast.loading('Generating PDF...')
    try {
      const cv = await publicApi.getCV(username, slug)
      const name = cv.data.personal_info.full_name || username
      await renderCVToPDF(
        cv.data,
        cv.theme    || 'minimal',
        cv.template || 'standard',
        `${name}-${slug}.pdf`,
      )
      toast.success('PDF downloaded', { id: toastId })
    } catch (e) {
      console.error(e)
      toast.error('Could not generate PDF', { id: toastId })
    } finally {
      setIsPrinting(false)
    }
  }, [])

  return { printCV, printPublicCV, printJob, clearJob, isPrinting }
}