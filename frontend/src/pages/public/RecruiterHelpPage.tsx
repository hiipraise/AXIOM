import { Link } from "react-router-dom";
import { Users, Settings, BarChart3, Video, CheckCircle, FileText, Zap, Shield } from "lucide-react";
import { Footer, Navbar } from "../../components/landing";

const SECTIONS = [
  {
    title: "Finding candidates",
    icon: Users,
    items: [
      ["Browse applications", "All applications to your jobs appear in Recruiter → Applications. Filter by job, status, or date."],
      ["Save to talent pools", "Click the bookmark icon on any candidate to save them to a talent pool for future roles."],
      ["View mock interviews", "See how candidates performed in practice interviews—great for screening before reaching out."],
    ],
  },
  {
    title: "Managing jobs",
    icon: Settings,
    items: [
      ["Post a job", "Go to Jobs → Post a Job. Fill in title, location, remote policy, and description."],
      ["Edit or close jobs", "Find your job in Jobs → My Jobs. Use the menu to edit or close postings."],
      ["Job templates", "Save time by duplicating job descriptions for similar roles."],
    ],
  },
  {
    title: "Interviews",
    icon: Video,
    items: [
      ["Schedule an interview", "In Applications, select a candidate → Schedule Interview. Pick date, time, and duration."],
      ["Join the room", "Access scheduled interviews from the Applications page or the interview link in your email."],
      ["Candidate practice data", "Review candidate interview practice sessions before your live interview."],
    ],
  },
  {
    title: "Your account",
    icon: Settings,
    items: [
      ["Update company profile", "Recruiter → Company Profile to add logo, website, and description."],
      ["Pricing and limits", "Standard accounts include 5 active jobs. Contact us for enterprise pricing."],
      ["Team access", "Staff accounts can add team members. Contact support for team setup."],
    ],
  },
];

export default function RecruiterHelpPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-28">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">Recruiter Help Center</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Hire better with AXIOM
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-muted">
          Everything you need to post jobs, find candidates, and conduct interviews.
          From application tracking to live video rooms—we've got you covered.
        </p>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          {SECTIONS.map(({ title, icon: Icon, items }) => (
            <div key={title} className="rounded-xl border border-ash-border bg-white p-6">
              <div className="flex items-center gap-2">
                <Icon size={18} className="text-ink" />
                <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
              </div>
              <dl className="mt-4 space-y-4">
                {items.map(([question, answer]) => (
                  <div key={question}>
                    <dt className="text-sm font-medium text-ink">{question}</dt>
                    <dd className="mt-1 text-sm text-ink-muted">{answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-xl bg-ash p-6">
          <h2 className="font-display text-lg font-bold text-ink">Need more help?</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Contact our team for onboarding support, enterprise pricing, or API integrations.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/recruiter/register" className="btn-primary">Create recruiter profile</Link>
            <Link to="/recruiter/applications" className="btn-secondary">Go to dashboard</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
