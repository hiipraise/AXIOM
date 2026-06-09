import { useNavigate } from "react-router-dom";

/**
 * useSmartBack — safe back navigation.
 *
 * Uses browser history when available (user navigated to this page),
 * falls back to the provided `fallback` route when the page was opened
 * directly (e.g. via a shared link, bookmark, or external redirect).
 *
 * Usage:
 *   const goBack = useSmartBack("/jobs/axiom");
 *   <button onClick={goBack}>← Back</button>
 */
export function useSmartBack(fallback = "/") {
  const navigate = useNavigate();
  return () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };
}