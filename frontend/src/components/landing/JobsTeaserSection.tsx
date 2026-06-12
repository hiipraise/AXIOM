import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Building2,
  FileSignature,
  MapPin,
  ScanSearch,
} from "lucide-react";
import { axiomJobsApi } from "../../api";
import { AxiomJob } from "../../types";

const STEPS = [
  {
    icon: Briefcase,
    label: "Find a role",
    desc: "Browse AXIOM roles and live external jobs across countries.",
  },
  {
    icon: ScanSearch,
    label: "Choose CV match",
    desc: "Turn on CV-aware matching when you want fit scores and keyword gaps.",
  },
  {
    icon: FileSignature,
    label: "Apply and track",
    desc: "Apply on-platform, generate a cover letter, and track every stage.",
  },
];

type TeaserJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  source: "axiom" | "external";
  href: string;
};

function normalizeAxiomJob(job: AxiomJob): TeaserJob {
  return {
    id: job.id,
    title: job.title,
    company: job.company_name,
    location: job.location || "Flexible",
    remote: job.remote,
    source: "axiom",
    href: `/jobs/axiom/${job.id}`,
  };
}

function JobFeedSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
      aria-label="Loading featured jobs"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-ash-border bg-white p-5 animate-pulse"
        >
          <div className="mb-4 h-3 w-20 rounded bg-ash-dark" />
          <div className="mb-2 h-5 w-4/5 rounded bg-ash-dark" />
          <div className="mb-5 h-3 w-1/2 rounded bg-ash-dark" />
          <div className="h-8 rounded-lg bg-ash-dark" />
        </div>
      ))}
    </div>
  );
}

export default function JobsTeaserSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["landing-jobs-teaser"],
    queryFn: async () => {
      const axiomJobs = await axiomJobsApi.list();
      return axiomJobs.slice(0, 3).map(normalizeAxiomJob);
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <section className="py-24 px-5 bg-white">
      <div className="max-w-5xl mx-auto" ref={ref}>
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
            Jobs, applications, and interviews in one workspace.
          </h2>
          <p className="text-ink-muted text-sm max-w-md mx-auto leading-relaxed">
            AXIOM is more than a CV generator now. Browse roles, apply
            on-platform, track progress, and prepare for the interview loop.
          </p>
        </motion.div>

        {isLoading ? (
          <JobFeedSkeleton />
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {jobs.map((job, i) => (
              <motion.div
                key={`${job.source}-${job.id}`}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.4,
                  delay: i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link
                  to={job.href}
                  className="block h-full rounded-2xl border border-ash-border bg-white p-5 text-left transition-colors hover:border-ink/30 hover:bg-ash/40"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span
                      className={`badge ${job.source === "axiom" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-ash-dark text-ink-muted"}`}
                    >
                      {job.source === "axiom" ? "AXIOM" : "Live role"}
                    </span>
                    {job.remote && (
                      <span className="text-[11px] text-ink-muted">Remote</span>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-ink line-clamp-2">
                    {job.title}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted line-clamp-1">
                    <Building2 size={12} /> {job.company}
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted line-clamp-1">
                    <MapPin size={12} /> {job.location}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/jobs/explore"
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
