import { Link } from "react-router-dom";
import { Briefcase, FileText, MessageSquare, ShieldCheck } from "lucide-react";
import { Footer, Navbar } from "../../components/landing";

const POINTS = [
  { icon: FileText, title: "CVs with evidence", body: "AXIOM pushes users toward specific achievements, measurable scope, and recruiter-ready structure." },
  { icon: Briefcase, title: "Jobs and tracking together", body: "Saved jobs, applications, statuses, and tailored CV work stay in one workspace." },
  { icon: MessageSquare, title: "Interview practice", body: "Candidates can rehearse answers, get feedback, and join live recruiter interviews from the same account." },
  { icon: ShieldCheck, title: "Built with guardrails", body: "Authentication, rate limits, safer PDF export, audit logging, and privacy-conscious defaults are part of the platform direction." },
];

export default function WhyAxiomPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-28">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">Why AXIOM</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Job search tools should connect the whole journey.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-muted">
          AXIOM is built for the messy middle of career growth: turning experience
          into a strong CV, choosing roles, applying with context, and preparing for
          the conversation that follows.
        </p>
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-lg border border-ash-border bg-white p-5">
              <Icon size={20} className="text-ink" />
              <h2 className="mt-4 font-display text-xl font-bold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
            </article>
          ))}
        </section>
        <div className="mt-10">
          <Link to="/jobs/explore" className="btn-primary">Browse jobs</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
