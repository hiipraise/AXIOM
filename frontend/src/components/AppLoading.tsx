import { useEffect, useState } from "react";

interface AppLoadingProps {
  fullScreen?: boolean;
  message?: string;
}

/**
 * Shown by React components (ProtectedRoute, etc.) while auth state resolves.
 * Listens to the same `axiom:load-progress` events emitted by main.tsx so the
 * progress bar reflects real backend readiness rather than a fake timer.
 */
export function AppLoading({ fullScreen = false, message }: AppLoadingProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus]     = useState("");

  useEffect(() => {
    function onProgress(e: Event) {
      const pct = (e as CustomEvent<number>).detail ?? 0;
      setProgress(pct);

      if (pct < 20)       setStatus("Connecting to server…");
      else if (pct < 50)  setStatus("Server starting up — free tier takes ~30 s");
      else if (pct < 88)  setStatus("Almost there…");
      else if (pct < 100) setStatus("Loading your account…");
      else                setStatus("");
    }

    window.addEventListener("axiom:load-progress", onProgress);
    return () => window.removeEventListener("axiom:load-progress", onProgress);
  }, []);

  const pct = Math.round(progress);

  return (
    <div
      role="status"
      aria-busy={progress < 100}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        minHeight:      fullScreen ? "100vh" : "240px",
        background:     "#F8FAFC",
        padding:        "24px",
        gap:            "16px",
      }}
    >
      {/* Logo mark */}
      <div
        aria-hidden="true"
        style={{
          width:          "44px",
          height:         "44px",
          borderRadius:   "8px",
          background:     "#0F172A",
          color:          "#F8FAFC",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontFamily:     '"Syne", sans-serif',
          fontWeight:     800,
          fontSize:       "14px",
          letterSpacing:  "0.02em",
        }}
      >
        AX
      </div>

      {/* Progress track */}
      <div style={{ width: "min(300px, 90vw)", display: "flex", flexDirection: "column", gap: "8px" }}>
        {message && (
          <p style={{ margin: 0, fontSize: "13px", color: "#334155", textAlign: "center" }}>
            {message}
          </p>
        )}

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          style={{
            height:       "5px",
            background:   "#E2E8F0",
            borderRadius: "999px",
            overflow:     "hidden",
          }}
        >
          <div
            style={{
              width:        `${pct}%`,
              height:       "100%",
              background:   "#0F172A",
              borderRadius: "inherit",
              transition:   "width 0.6s ease-out",
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "#64748B" }}>
            {status || (pct > 0 ? "Loading…" : "")}
          </p>
          <p style={{ margin: 0, fontSize: "11px", color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>
            {pct > 0 ? `${pct}%` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AppLoading;