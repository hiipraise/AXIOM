import { useState, useCallback } from 'react'
import { cvApi, publicApi } from '../api'
import { CVData } from '../types'
import toast from 'react-hot-toast'

interface PrintJob {
  cvData: CVData
  theme: string
  template: string
}

export function usePrintCV() {
  const [printJob, setPrintJob] = useState<PrintJob | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  const clearJob = useCallback(() => {
    setPrintJob(null)
    setIsPrinting(false)
  }, [])

  const printCV = useCallback(async (cvId: string) => {
    setIsPrinting(true)
    try {
      const cv = await cvApi.get(cvId)
      setPrintJob({
        cvData: cv.data,
        theme: cv.theme || 'minimal',
        template: cv.template || 'standard',
      })
      // window.print() is called by PrintFrame's useEffect after render
    } catch {
      toast.error('Could not load CV for printing')
      setIsPrinting(false)
    }
  }, [])

  const printPublicCV = useCallback(async (username: string, slug: string) => {
    setIsPrinting(true)
    try {
      const cv = await publicApi.getCV(username, slug)
      setPrintJob({
        cvData: cv.data,
        theme: cv.theme || 'minimal',
        template: cv.template || 'standard',
      })
    } catch {
      toast.error('Could not load CV for printing')
      setIsPrinting(false)
    }
  }, [])

  return { printCV, printPublicCV, printJob, clearJob, isPrinting }
}