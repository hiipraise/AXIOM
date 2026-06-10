import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import FeedbackWidget from "../FeedbackWidget";

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
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-[1ch] text-xs text-ink-muted">
            <span>© {new Date().getFullYear()}</span>
            <SpellingWord />
            <span>.</span>
          </p>
          <a
            className="mt-2 block text-xs text-ink-muted hover:text-ink"
            href="mailto:hello@axiomcv.site"
          >
            hello@axiomcv.site
          </a>
        </div>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
          <Link to="/about" className="hover:text-ink">About</Link>
          <Link to="/why-axiom" className="hover:text-ink">Why AXIOM</Link>
          <Link to="/recruiter/help" className="hover:text-ink">Recruiter help</Link>
          <Link to="/terms" className="hover:text-ink">Terms</Link>
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
          <FeedbackWidget inline />
        </nav>
      </div>
    </footer>
  );
}
