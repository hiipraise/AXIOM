import { useEffect, useState } from "react";

type AppLoadingProps = {
  message?: string;
  ready?: boolean;
  className?: string;
};

export function AppLoading({
  message = "Starting Axiom",
  ready = false,
  className = "",
}: AppLoadingProps) {
  const [progress, setProgress] = useState(8);
  const [isReady, setIsReady] = useState(ready);

  useEffect(() => {
    setIsReady(ready);
  }, [ready]);

  useEffect(() => {
    const onReady = () => setIsReady(true);

    window.addEventListener("axiom:app-ready", onReady);
    return () => window.removeEventListener("axiom:app-ready", onReady);
  }, []);

  useEffect(() => {
    if (isReady) {
      setProgress(100);
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const cap = elapsed > 12_000 ? 92 : elapsed > 6_000 ? 88 : 82;

      setProgress((current) => {
        const next = current + Math.max(0.25, (cap - current) * 0.035);
        return Math.min(next, cap);
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [isReady]);

  const percent = Math.round(progress);

  return (
    <div
      className={`app-loading ${className}`.trim()}
      aria-busy={!isReady}
      style={{
        display: "grid",
        minHeight: "100vh",
        placeItems: "center",
        padding: "24px",
        background: "#0f172a",
        color: "#f8fafc",
      }}
    >
      <div
        className="app-loading__mark"
        aria-hidden="true"
        style={{
          display: "grid",
          width: "56px",
          height: "56px",
          marginBottom: "20px",
          placeItems: "center",
          borderRadius: "8px",
          background: "#f8fafc",
          color: "#0f172a",
          fontWeight: 800,
          letterSpacing: 0,
        }}
      >
        AX
      </div>
      <div className="app-loading__content" style={{ width: "min(360px, 100%)" }}>
        <p className="app-loading__message" style={{ margin: "0 0 12px", textAlign: "center", fontSize: "14px" }}>
          {message}
        </p>
        <div
          className="app-loading__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          style={{
            height: "6px",
            overflow: "hidden",
            borderRadius: "999px",
            background: "rgba(248, 250, 252, 0.2)",
          }}
        >
          <div
            className="app-loading__bar"
            style={{
              width: `${percent}%`,
              height: "100%",
              borderRadius: "inherit",
              background: "#38bdf8",
              transition: "width 250ms ease",
            }}
          />
        </div>
        <p className="app-loading__percent" style={{ margin: "10px 0 0", textAlign: "center", fontSize: "12px" }}>
          {percent}%
        </p>
      </div>
    </div>
  );
}

export default AppLoading;
