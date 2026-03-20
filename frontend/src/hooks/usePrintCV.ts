/**
 * usePrintCV
 * Renders a hidden CVRenderer in the CURRENT page and calls window.print().
 * No new window = no sessionStorage/auth loss.
 */
import { useState, useCallback } from 'react'
import { cvApi, publicApi } from '../api'
import { CVData } from '../types'
import toast from 'react-hot-toast'

interface PrintJob {
  cvData: CVData
  theme: string
  template: string
}

// Shared state — module-level so PrintFrame and usePrintCV stay in sync
// across different component instances
let _setJob: ((j: PrintJob | null) => void) | null = null

export function usePrintCV() {
  const [job, setJob] = useState<PrintJob | null>(null)
  const [loading, setLoading] = useState(false)
  _setJob = setJob

  const triggerPrint = useCallback((printJob: PrintJob) => {
    setJob(printJob)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.print()
          setTimeout(() => setJob(null), 1500)
        }, 400)
      })
    })
  }, [])

  const printCV = useCallback(async (cvId: string) => {
    setLoading(true)
    try {
      const cv = await cvApi.get(cvId)
      triggerPrint({ cvData: cv.data, theme: cv.theme || 'minimal', template: cv.template || 'standard' })
    } catch {
      toast.error('Could not load CV for printing')
    } finally {
      setLoading(false)
    }
  }, [triggerPrint])

  const printPublicCV = useCallback(async (username: string, slug: string) => {
    setLoading(true)
    try {
      const cv = await publicApi.getCV(username, slug)
      triggerPrint({ cvData: cv.data, theme: cv.theme || 'minimal', template: cv.template || 'standard' })
    } catch {
      toast.error('Could not load CV for printing')
    } finally {
      setLoading(false)
    }
  }, [triggerPrint])

  return { printCV, printPublicCV, printJob: job, isPrinting: loading }
}