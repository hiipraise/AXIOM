import { Link } from "react-router-dom";
import { Footer, Navbar } from "../../components/landing";

const FAQS = [
  ["How do recruiters join a meeting?", "Open the scheduled interview link from Applications. Recruiters and candidates use the same room; recruiters see interviewer controls after joining."],
  ["How do I schedule an interview?", "Go to Recruiter > Applications, choose an interview type, pick a date, time, and duration, then schedule the invite."],
  ["Can I ask follow-up questions?", "Yes. In the live interview room, recruiters can send follow-up questions and keep private employer notes."],
  ["How many active jobs can I post?", "Standard recruiter accounts currently have a limit of five active jobs. Staff and admin roles can manage broader posting needs."],
];

export default function RecruiterHelpPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-28">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">Recruiter Help Center</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Hiring on AXIOM
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-muted">
          Quick answers for posting jobs, reviewing applications, scheduling interviews,
          and joining live rooms with candidates.
        </p>
        <section className="mt-10 divide-y divide-ash-border rounded-lg border border-ash-border bg-white">
          {FAQS.map(([question, answer]) => (
            <article key={question} className="p-5">
              <h2 className="font-semibold text-ink">{question}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{answer}</p>
            </article>
          ))}
        </section>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/recruiter/register" className="btn-primary">Create recruiter profile</Link>
          <Link to="/recruiter/applications" className="btn-secondary">View applications</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
