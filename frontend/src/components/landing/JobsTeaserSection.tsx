import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  FileSignature,
  ScanSearch,
  AlertTriangle,
} from "lucide-react";
import { jobsApi } from "../../api";

const STEPS = [
  {
    icon: Briefcase,
    label: "Find a role",
    desc: "Browse live external jobs across countries.",
  },
  {
    icon: ScanSearch,
    label: "Choose CV match",
    desc: "Turn on CV-aware matching when you want fit scores and keyword gaps.",
  },
  {
    icon: FileSignature,
    label: "Save and prepare",
    desc: "Save jobs, generate a cover letter, and prepare your application materials.",
  },
];

export default function JobsTeaserSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  // Lightweight provider health check (single request, minimal params)
  const { data: healthCheck } = useQuery({
    queryKey: ["jobs-provider-health"],
    queryFn: () =>
      jobsApi
        .search({ q: "", per_page: 1 })
        .then((r) => r.source_health ?? null),
    staleTime: 120_000, // 2 min — avoid hammering on scroll
    retry: 1,
  });

  const providersUnavailable =
    healthCheck && healthCheck.configured > 0 && healthCheck.succeeded === 0;

  return (
    <section className="py-24 px-5 bg-white">
      <div className="max-w-5xl mx-auto" ref={ref}>
        {providersUnavailable && (
          <div className="mb-8 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <AlertTriangle
              size={14}
              className="mt-0.5 flex-shrink-0 text-amber-500"
            />
            <span>
              Job sources are currently unavailable — jobs may not load. Try
              again later.
            </span>
          </div>
        )}

        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3">
            Now in AXIOM
          </p>
          <h2 className="font-display font-bold text-3xl text-ink mb-3">
            Jobs, saved roles, and interviews in one workspace.
          </h2>
          <p className="text-ink-muted text-sm max-w-md mx-auto leading-relaxed">
            AXIOM is more than a CV generator now. Browse roles, save the ones
            you like, and prepare for the interview loop.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              className="bg-ash rounded-2xl border border-ash-border p-6"
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.4,
                delay: i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center mb-4">
                <motion.div
                  animate={{ rotate: [0, -15, 15, -8, 8, 0] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    repeatDelay: 3 + i * 0.7,
                    ease: "easeInOut",
                  }}
                >
                  <Icon size={16} className="text-white" />
                </motion.div>
              </div>
              <p className="font-semibold text-sm text-ink mb-1">{label}</p>
              <p className="text-xs text-ink-muted leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Jobs teaser screenshot ── */}
        <motion.div
          className="mx-auto max-w-2xl my-12"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative aspect-video rounded-2xl bg-ash border border-ash-border overflow-hidden shadow-sm">
            <img
              src="/assets/screenshots/jobs_teaser_cover_letter.png"
              alt="Cover letter generation and saved jobs interface in AXIOM"
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const fb = target.nextElementSibling;
                if (fb) (fb as HTMLElement).classList.remove("hidden");
              }}
            />
            <div className="absolute inset-0 hidden items-center justify-center text-ink-muted/40 text-xs select-none">
              <span>Cover letter / saved jobs screenshot</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white text-sm font-medium rounded-xl hover:bg-ink-light transition-colors"
          >
            Browse live jobs
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
          <p className="text-xs text-ink-muted mt-3">
            No account needed to browse
          </p>
        </motion.div>
      </div>
    </section>
  );
}
