// src/components/AppLoading.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SEQUENCE = ["A", "X", "I", "O", "M", "AXIOM"];
const LETTER_MS = 500;
const FULL_MS = 1600;

function SpellingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const isLast = index === SEQUENCE.length - 1;

    const t = setTimeout(
      () => setIndex((i) => (i + 1) % SEQUENCE.length),
      isLast ? FULL_MS : LETTER_MS,
    );

    return () => clearTimeout(t);
  }, [index]);

  return (
    <span className="inline-flex justify-center" style={{ width: "8ch" }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={SEQUENCE[index]}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          className="inline-block"
        >
          {SEQUENCE[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

interface AppLoadingProps {
  fullScreen?: boolean;
}

export default function AppLoading({
  fullScreen = false,
}: AppLoadingProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;

    const interval = window.setInterval(() => {
      current += Math.floor(Math.random() * 8) + 2;

      if (current >= 100) {
        current = 100;
        clearInterval(interval);
      }

      setProgress(current);
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const radius = 74;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset =
    circumference - (progress / 100) * circumference;

  return (
    <div
      className={`flex items-center justify-center bg-[#F8FAFC] px-6 ${
        fullScreen ? "min-h-screen" : "min-h-[60vh]"
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <svg
            width="190"
            height="190"
            viewBox="0 0 190 190"
            className="-rotate-90"
          >
            {/* background ring */}
            <circle
              cx="95"
              cy="95"
              r={radius}
              stroke="#E2E8F0"
              strokeWidth="4"
              fill="transparent"
            />

            {/* animated progress ring */}
            <motion.circle
              cx="95"
              cy="95"
              r={radius}
              stroke="#0F172A"
              strokeWidth="8"
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={circumference}
              animate={{
                strokeDashoffset,
              }}
              transition={{
                duration: 0.25,
                ease: "easeOut",
              }}
            />
          </svg>

          {/* center content */}
          <div className="absolute flex flex-col items-center justify-center">
            <motion.span
              key={progress}
              initial={{ opacity: 0.4, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="font-display text-4xl font-700 tracking-tight text-[#0F172A]"
            >
              {progress}%
            </motion.span>

            <div className="mt-1 text-sm font-600 uppercase tracking-[0.22em] text-[#0F172A]">
              <SpellingWord />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}