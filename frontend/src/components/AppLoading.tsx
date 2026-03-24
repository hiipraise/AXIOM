import { useEffect, useState } from 'react'

interface AppLoadingProps {
  fullScreen?: boolean
}

export default function AppLoading({ fullScreen = false }: AppLoadingProps) {
  const [isSlow, setIsSlow] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSlow(true), 3500)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div
      className={`flex items-center justify-center bg-white px-6 ${
        fullScreen ? 'min-h-screen' : 'min-h-[60vh]'
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-ash-border bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ash-border border-t-ink" />
        <p className="font-display text-lg font-700 text-ink">Loading your workspace…</p>
        <p className="mt-1 text-sm text-ink-muted">Setting things up. This should only take a moment.</p>
        {isSlow && (
          <p className="mt-3 text-xs text-ink-muted">
            Taking longer than expected — still working, please hang tight.
          </p>
        )}
      </div>
    </div>
  )
}
