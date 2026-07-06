import { Link } from "react-router-dom";
import { FileText, MessageSquare, Target, BarChart3 } from "lucide-react";
import { Footer, Navbar } from "../../components/landing";
import Seo from "../../components/Seo";

const FEATURES = [
  { icon: FileText, title: "CVs that land interviews", body: "AI-generated CVs tailored to each job. ATS-optimized format ensures your experience translates exactly as intended." },
  { icon: Target, title: "Smarter job discovery", body: "Find roles that match your actual skills—not just keyword matches. Local and remote opportunities curated for your career level." },
  { icon: MessageSquare, title: "Interview confidence", body: "Practice with AI feedback on clarity, specificity, and evidence. Progress from practice rooms to real interviews." },
  { icon: BarChart3, title: "Application tracking", body: "Know exactly where every application stands. No more lost submissions or ghosted responses." },
];
export default function WhyAxiomPage() {
  return (
    <div className="min-h-screen bg-white">
      <Seo
        title="Why Axiom"
        description="AI CV building, smart job discovery, application tracking, and interview practice in one platform. Your career deserves better tools."
      />
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

        <div className="mt-16 flex flex-wrap gap-4">
          <Link to="/register" className="btn-primary">Get started free</Link>
          <Link to="/jobs/explore" className="btn-secondary">Browse jobs</Link>

        </div>
      </main>
      <Footer />
    </div>
  );
}
