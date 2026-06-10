// src/hooks/useScrollRestoration.ts
//
// BrowserRouter doesn't ship scroll restoration.
// location.key is stable for the same history entry (back/forward reuses it),
// so we key saved positions on it:
//   – first visit to a key → no saved position → scroll to top
//   – back/forward to a known key → restore the saved position

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const positions = new Map<string, number>();

export function useScrollRestoration() {
  const { key } = useLocation();

  // Track scroll position for the current page
  useEffect(() => {
    const save = () => positions.set(key, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [key]);

  // On key change: restore or reset
  useEffect(() => {
    const saved = positions.get(key);
    if (saved !== undefined) {
      // rAF waits for React to finish painting before scrolling
      requestAnimationFrame(() => window.scrollTo(0, saved));
    } else {
      window.scrollTo(0, 0);
    }
  }, [key]);
                            }
