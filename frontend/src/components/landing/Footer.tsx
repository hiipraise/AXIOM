import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SEQUENCE = ["A", "X", "I", "O", "M", "AXIOM"];
const LETTER_MS = 500; // how long each single letter shows
const FULL_MS = 1600; // how long the full AXIOM shows

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
    <span className="inline-flex justify-center" style={{ width: "3.2ch" }}>
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

export default function Footer() {
  return (
    <footer className="border-t border-ash-border px-5 py-8">
      <div className="max-w-5xl mx-auto flex items-center justify-center">
        <p className="text-xs text-ink-muted flex items-center gap-[1ch]">
          <span>© {new Date().getFullYear()}</span>
          <SpellingWord />
          <span>.</span>
        </p>
      </div>
    </footer>
  );
}
