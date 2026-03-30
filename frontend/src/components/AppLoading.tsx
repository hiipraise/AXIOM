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
    <span className="inline-flex justify-center" style={{ width: "5ch" }}>
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

export default function AppLoading({ fullScreen = false }: AppLoadingProps) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSlow(true), 3500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={`flex items-center justify-center bg-white px-6 ${
        fullScreen ? "min-h-screen" : "min-h-[60vh]"
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-ash-border bg-white p-6 text-center shadow-sm">
        <p className="font-display text-lg font-700 text-ink flex items-center justify-center gap-[1ch]">
          <SpellingWord />
          <span>is loading…</span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Setting things up. This should only take a moment.
        </p>
        {isSlow && (
          <p className="mt-3 text-xs text-ink-muted">
            Taking longer than expected — still working, please hang tight.
          </p>
        )}
      </div>
    </div>
  );
}
