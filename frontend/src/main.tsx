import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { authApi } from './api'
import { useAuthStore } from './store/auth'
import './index.css'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

/**
 * Bootstrap: call /auth/me once on startup.
 * If the httpOnly cookie is present and valid, the backend returns the user.
 * If not (logged out / cookie expired), it returns 401 which the interceptor
 * handles by dispatching axiom:logout → clearAuth().
 */
async function bootstrap() {
  try {
    const user = await authApi.me()
    useAuthStore.getState().setAuth(user)
  } catch {
    useAuthStore.getState().clearAuth()
  }
}

bootstrap().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
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