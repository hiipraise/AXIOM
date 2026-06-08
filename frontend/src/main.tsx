import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { authApi } from './api'
import { useAuthStore } from './store/auth'
import { usePageTracking } from './components/admin/useAnalytics'
import { AnnouncementProvider } from './context/announcement'
import AnnouncementBanner from './components/AnnouncementBanner'
import './index.css'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

function AppWithTracking() {
  usePageTracking()
  return <App />
}

// ─── Real progress events → picked up by the index.html boot loader ──────────
function emitProgress(pct: number) {
  window.dispatchEvent(
    new CustomEvent('axiom:load-progress', { detail: Math.min(100, Math.round(pct)) })
  )
}

// ─── Poll /health until backend is alive (handles Render cold-start) ──────────
async function waitForBackend(): Promise<void> {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const healthUrl = `${base}/health`
  const START = Date.now()
  const MAX_WAIT = 90_000   // 90 s — generous for free Render
  const POLL_MS  = 3_000    // retry every 3 s

  emitProgress(8)

  while (Date.now() - START < MAX_WAIT) {
    try {
      const ctrl = new AbortController()
      const tid  = setTimeout(() => ctrl.abort(), 8_000)
      const res  = await fetch(healthUrl, { signal: ctrl.signal })
      clearTimeout(tid)
      if (res.ok) {
        emitProgress(88)
        return
      }
    } catch {
      // backend not up yet — keep polling
    }

    // Crawl progress proportionally to elapsed time, cap at 82 %
    const elapsed = Date.now() - START
    emitProgress(8 + (elapsed / MAX_WAIT) * 74)
    await new Promise<void>(r => setTimeout(r, POLL_MS))
  }

  // Timed out — proceed anyway (user will see API errors inline)
  emitProgress(88)
}

// ─── Auth bootstrap ───────────────────────────────────────────────────────────
async function bootstrap() {
  await waitForBackend()
  emitProgress(94)

  try {
    const user = await authApi.me()
    useAuthStore.getState().setAuth(user)
  } catch {
    useAuthStore.getState().clearAuth()
  }

  emitProgress(100)
}

bootstrap().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <AnnouncementProvider>
            <AnnouncementBanner />
            <AppWithTracking />
          </AnnouncementProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '13px',
                fontFamily: '"DM Sans", system-ui, sans-serif',
                color: '#0F172A',
                boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  )
})