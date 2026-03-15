/**
 * Tiny analytics hook — generates a stable session ID per browser session
 * (sessionStorage, not localStorage) and fires a page-view event on every
 * route change. No personal data leaves the browser beyond user_id when logged in.
 */
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../../api'

function getSessionId(): string {
  const key = 'axiom_sid'
  let sid = sessionStorage.getItem(key)
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem(key, sid)
  }
  return sid
}

export function usePageTracking() {
  const location  = useLocation()
  const prevPath  = useRef<string | null>(null)

  useEffect(() => {
    const path = location.pathname
    if (path === prevPath.current) return
    prevPath.current = path

    // fire and forget — errors are silently swallowed
    api.post('/analytics/event', {
      path,
      referrer:   prevPath.current ?? document.referrer ?? '',
      session_id: getSessionId(),
    }).catch(() => {})
  }, [location.pathname])
}