import { Link } from "react-router-dom";
import { Briefcase, FileText, MessageSquare, ShieldCheck, Users, Target, Zap, BarChart3 } from "lucide-react";
import { Footer, Navbar } from "../../components/landing";

const FEATURES = [
  { icon: FileText, title: "CVs that land interviews", body: "AI-generated CVs tailored to each job. ATS-optimized format ensures your experience translates exactly as intended." },
  { icon: Target, title: "Smarter job discovery", body: "Find roles that match your actual skills—not just keyword matches. Local and remote opportunities curated for your career level." },
  { icon: MessageSquare, title: "Interview confidence", body: "Practice with AI feedback on clarity, specificity, and evidence. Progress from practice rooms to real interviews." },
  { icon: BarChart3, title: "Application tracking", body: "Know exactly where every application stands. No more lost submissions or ghosted responses." },
];

const COMPARISON = [
  { axe: "LinkedIn", axiom: "AXIOM CVs are job-specific—not a generic profile. AI suggests changes per application." },
  { axe: "Indeed", axiom: "AXIOM tracks status changes and reminds you to follow up. No more Indeed ghosting." },
  { axe: "Teal", axiom: "AXIOM includes interview practice with real-time feedback, not just job tracking." },
  { axe: "Resume.io", axiom: "AXIOM builds from your data—not templates. One source of truth, infiniteTailored CVs." },
];

export default function WhyAxiomPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-28">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">Why AXIOM</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Your career deserves better tools.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-muted">
          AXIOM combines AI CV building, smart job discovery, application tracking,
          and interview practice into one platform. No more juggling multiple apps
          or losing track of where you applied.
        </p>

        <section className="mt-16 grid gap-6 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-xl border border-ash-border bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink">
                <Icon size={20} className="text-white" />
              </div>
              <h2 className="mt-4 font-display text-xl font-bold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-ink">How AXIOM compares</h2>
          <p className="mt-2 text-sm text-ink-muted">
            We don't try to be everything. We do what other tools miss.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {COMPARISON.map(({ axe, axiom }) => (
              <div key={axe} className="flex gap-4 rounded-lg border border-ash-border bg-ash/30 p-4">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-ink-muted">{axe}</p>
                  <p className="mt-1 text-sm text-ink-muted line-through">{axe}...</p>
                </div>
                <div className="flex-1 border-l border-ash-border pl-4">
                  <p className="text-xs uppercase tracking-wider text-ink">AXIOM</p>
                  <p className="mt-1 text-sm text-ink">{axiom}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-16 flex flex-wrap gap-4">
          <Link to="/register" className="btn-primary">Get started free</Link>
          <Link to="/jobs/explore" className="btn-secondary">Browse jobs</Link>
          <Link to="/recruiter" className="btn-ghost">For Recruiters</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
