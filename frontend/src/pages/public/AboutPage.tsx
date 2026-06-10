import { Link } from "react-router-dom";
import { Footer, Navbar } from "../../components/landing";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-28">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">About AXIOM</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          A career workspace for clearer applications.
        </h1>
        <div className="mt-8 grid gap-8 text-sm leading-7 text-ink-muted md:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <p>
              AXIOM helps candidates build truthful, focused CVs, find better roles,
              track applications, and practise interviews without losing the thread
              between each step.
            </p>
            <p>
              The platform is designed for practical job search work: fewer generic
              claims, stronger evidence, better recruiter context, and a smoother path
              from CV to application to interview.
            </p>
          </section>
          <section className="rounded-lg border border-ash-border bg-ash/40 p-5">
            <h2 className="font-display text-xl font-bold text-ink">What we care about</h2>
            <ul className="mt-4 space-y-3">
              <li>Truthful CV content that does not invent experience.</li>
              <li>Candidate ownership of their career data.</li>
              <li>Recruiter workflows that are simple enough to actually use.</li>
              <li>AI assistance that improves judgement instead of replacing it.</li>
            </ul>
          </section>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/register" className="btn-primary">Start free</Link>
          <Link to="/why-axiom" className="btn-secondary">Why AXIOM</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
