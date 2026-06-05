// src/components/AppLoading.tsx
import { useEffect, useRef, useState } from "react";

interface AppLoadingProps {
  fullScreen?: boolean;
  message?: string;
}

const SEQUENCE = ["A", "X", "I", "O", "M", "AXIOM"];
const LETTER_MS = 500;
const FULL_MS = 1600;

export function AppLoading({ fullScreen = false, message }: AppLoadingProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [spellingIndex, setSpellingIndex] = useState(0);
  const [letterKey, setLetterKey] = useState(0); // force re-mount for animation

  // Spelling animation
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function advance(idx: number) {
      const next = (idx + 1) % SEQUENCE.length;
      const delay = idx === SEQUENCE.length - 1 ? FULL_MS : LETTER_MS;
      timeout = setTimeout(() => {
        setSpellingIndex(next);
        setLetterKey((k) => k + 1);
        advance(next);
      }, delay);
    }

    advance(0);
    return () => clearTimeout(timeout);
  }, []);

  // Progress events
  useEffect(() => {
    function onProgress(e: Event) {
      const pct = (e as CustomEvent<number>).detail ?? 0;
      setProgress(pct);

      if (pct < 20) setStatus("Connecting to server…");
      else if (pct < 50) setStatus("Server starting up — takes ~30 s");
      else if (pct < 88) setStatus("Almost there…");
      else if (pct < 100) setStatus("Loading your account…");
      else setStatus("");
    }

    window.addEventListener("axiom:load-progress", onProgress);
    return () => window.removeEventListener("axiom:load-progress", onProgress);
  }, []);

  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference -
    (Math.min(100, Math.max(0, progress)) / 100) * circumference;
  const pct = Math.round(progress);
  const currentWord = SEQUENCE[spellingIndex];

  return (
    <>
      <style>{`
        @keyframes axiom-letter-in {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .axiom-letter { animation: none !important; }
          .axiom-ring   { transition: none !important; }
        }
      `}</style>

      <div
        role="status"
        aria-live="polite"
        aria-busy={progress < 100}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: fullScreen ? "100vh" : "240px",
          background: "#F8FAFC",
          color: "#0F172A",
          overflow: "hidden",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Ring stage */}
          <div
            style={{
              position: "relative",
              width: 190,
              height: 190,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 190 190"
              width={190}
              height={190}
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx={95}
                cy={95}
                r={74}
                fill="transparent"
                stroke="#E2E8F0"
                strokeWidth={4}
              />
              <circle
                className="axiom-ring"
                cx={95}
                cy={95}
                r={74}
                fill="transparent"
                stroke="#0F172A"
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
              />
            </svg>

            {/* Center content */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: '"Syne", sans-serif',
                  fontSize: 42,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: "#0F172A",
                }}
              >
                {pct}%
              </p>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#0F172A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 18,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    width: "8ch",
                    overflow: "hidden",
                  }}
                >
                  <span
                    key={letterKey}
                    className="axiom-letter"
                    style={{
                      display: "inline-block",
                      animation: "axiom-letter-in 0.18s ease-in-out forwards",
                    }}
                  >
                    {currentWord}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Status / message */}
          <p
            style={{
              marginTop: 20,
              fontSize: 11,
              color: "#64748B",
              letterSpacing: "0.04em",
              textAlign: "center",
              minHeight: 16,
            }}
          >
            {message ?? status}
          </p>
        </div>
      </div>
    </>
  );
}

export default AppLoading;
