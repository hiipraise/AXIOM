import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// ─── Ghost CV card — skeleton with optional image fallback ────────────────
interface GhostCardProps {
  style: React.CSSProperties;
  driftY: number;
  duration: number;
  delay: number;
  rotate: number;
  image?: string;
  alt?: string;
}

function GhostCard({
  style,
  driftY,
  duration,
  delay,
  rotate,
  image,
  alt,
}: GhostCardProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <motion.div
      className="absolute w-48 h-36 bg-white border border-ash-border rounded-xl p-4 shadow-sm pointer-events-none overflow-hidden"
      style={{ rotate, ...style }}
      animate={{ y: [0, -driftY, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Skeleton (shown until image loads, or permanently if no image) */}
      <motion.div
        className="absolute inset-0 p-4"
        animate={{ opacity: image && loaded ? 0 : 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        {/* Company logo + role row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-ash-border flex-shrink-0" />
          <div className="space-y-1 flex-1">
            <div className="h-2 bg-ash-border rounded-full w-4/5" />
            <div className="h-1.5 bg-ash-border/60 rounded-full w-1/2" />
          </div>
        </div>
        {/* Salary / location lines */}
        <div className="space-y-1.5">
          <div className="h-1.5 bg-ash-border/70 rounded-full w-full" />
          <div className="h-1.5 bg-ash-border/50 rounded-full w-3/4" />
        </div>
        {/* Job tags */}
        <div className="flex gap-1 mt-3">
          {[10, 14, 8].map((w, i) => (
            <div
              key={i}
              className="h-3.5 bg-ash-border/50 rounded-full"
              style={{ width: `${w * 4}px` }}
            />
          ))}
        </div>
      </motion.div>

      {/* Image overlay — fades in once loaded */}
      {image && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <img
            src={image}
            alt={alt ?? ""}
            className="w-full h-full object-cover rounded-xl"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(false)}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

const CARDS: (GhostCardProps & { image?: string; alt?: string })[] = [
  {
    style: { left: "4%", top: "10%" },
    driftY: 14,
    duration: 5.8,
    delay: 0,
    rotate: -5,
    image: "/assets/screenshots/explore/explore_teaser_jobcard_1.png",
    alt: "Job board card example 1",
  },
  {
    style: { left: "18%", top: "52%" },
    driftY: 10,
    duration: 7.2,
    delay: 1.1,
    rotate: 3,
    image: "/assets/screenshots/explore/explore_teaser_jobcard_2.png",
    alt: "Job board card example 2",
  },
  {
    style: { right: "4%", top: "8%" },
    driftY: 16,
    duration: 6.4,
    delay: 0.6,
    rotate: 6,
    image: "/assets/screenshots/explore/explore_teaser_jobcard_3.png",
    alt: "Job board card example 3",
  },
  {
    style: { right: "16%", top: "55%" },
    driftY: 12,
    duration: 5.2,
    delay: 2.0,
    rotate: -4,
    image: "/assets/screenshots/explore/explore_teaser_jobcard_4.png",
    alt: "Job board card example 4",
  },
];

// ─── Section ─────────────────────────────────────────────────────────────────
export default function ExploreTeaserSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="explore"
      className="relative py-24 px-5 bg-ash overflow-hidden"
    >
      {/* Ghost cards — left/right edges, faded out toward centre */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          maskImage:
            "linear-gradient(to right, black 0%, transparent 30%, transparent 70%, black 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, black 0%, transparent 30%, transparent 70%, black 100%)",
        }}
      >
        {CARDS.map((card, i) => (
          <GhostCard key={i} {...card} />
        ))}
      </div>

      {/* Content */}
      <div className="relative max-w-5xl mx-auto text-center" ref={ref}>
        <motion.p
          className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          Community
        </motion.p>

        <motion.h2
          className="font-display font-bold text-3xl text-ink mb-4"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          See what's out there.
        </motion.h2>

        <motion.p
          className="text-ink-muted text-sm max-w-md mx-auto mb-8 leading-relaxed"
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          Browse live job listings from across the web, match your CV to each
          role, and save the ones you like — all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white text-sm font-medium rounded-xl hover:bg-ink-light transition-colors"
          >
            Browse jobs
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ArrowRight size={14} />
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
