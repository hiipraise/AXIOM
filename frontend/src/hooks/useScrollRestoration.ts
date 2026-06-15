// BrowserRouter doesn't ship scroll restoration.
// We use pathname (e.g., /cv/123) as the key to ensure each unique URL
// has its own scroll position - critical for routes like /cv/:id where
// switching between different CVs should not share scroll positions.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
const positions = new Map<string, number>();
function scrollToHash(hash: string) {
  if (!hash) return;
  const id = hash.replace(/^#/, "");
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}
export function useScrollRestoration() {
  const { pathname, hash } = useLocation();
  // Track scroll position for the current page
  useEffect(() => {
    const save = () => positions.set(pathname, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [pathname]);
  // On pathname change: restore or reset
  useEffect(() => {
    const saved = positions.get(pathname);
    if (saved !== undefined) {
      // rAF waits for React to finish painting before scrolling
      requestAnimationFrame(() => window.scrollTo(0, saved));
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  // Handle hash navigation - scroll to element after route change
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => scrollToHash(hash));
    }
  }, [pathname, hash]);
}