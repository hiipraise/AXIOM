import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  Video,
  BarChart3,
  FileText,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Lightbulb,
} from "lucide-react";
import { Footer, Navbar } from "../../components/landing";

const BENEFITS = [
  {
    icon: Users,
    title: "Access qualified candidates",
    body: "Review applications with CV snapshots, save candidates to talent pools, and see interview practice performance before reaching out.",
  },
  {
    icon: Building2,
    title: "Employer brand pages",
    body: "Showcase your company culture, open roles, and candidate reviews on your branded AXIOM company page.",
  },
  {
    icon: Video,
    title: "Live interview rooms",
    body: "Schedule and conduct video interviews directly on AXIOM. No third-party tools required.",
  },
  {
    icon: BarChart3,
    title: "Application analytics",
    body: "Track where candidates come from, time-to-hire metrics, and pipeline health at a glance.",
  },
];

const INTEGRATIONS = [
  { name: "Greenhouse", status: "API available" },
  { name: "Lever", status: "API available" },
  { name: "Workday", status: "Coming soon" },
  { name: "Ashby", status: "Coming soon" },
];

const STEPS = [
  {
    num: "01",
    title: "Create your profile",
    body: "Sign up and add your company details, logo, and website.",
  },
  {
    num: "02",
    title: "Post your jobs",
    body: "List open roles with clear requirements and company info.",
  },
  {
    num: "03",
    title: "Review applications",
    body: "Browse candidates, save to pools, and track statuses.",
  },
  {
    num: "04",
    title: "Schedule interviews",
    body: "Book live video rooms and evaluate candidates.",
  },
];

export default function RecruiterLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">For Recruiters</p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Hire better with AXIOM
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-muted">
              Post jobs, track applications, and conduct interviews—all from one platform.
              Access qualified candidates who have already practiced with AI.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/recruiter/register" className="btn-primary">
                Create recruiter account <ArrowRight size={16} />
              </Link>
              <Link to="/recruiter/help" className="btn-secondary">
                Learn more
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-ink-muted">
              <span className="flex items-center gap-2">
                <CheckCircle size={14} className="text-purple-500" />
                Free to post jobs
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle size={14} className="text-purple-500" />
                No credit card required
              </span>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="rounded-2xl bg-ash p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-lg bg-white p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink">
                    <Users size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">Application tracking</p>
                    <p className="text-sm text-ink-muted">Review, save, and categorize candidates</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg bg-white p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink">
                    <Video size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">Live video interviews</p>
                    <p className="text-sm text-ink-muted">Built-in video rooms, no external tools</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg bg-white p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink">
                    <BarChart3 size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">Pipeline analytics</p>
                    <p className="text-sm text-ink-muted">Know where every candidate stands</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-20">
          <h2 className="font-display text-2xl font-bold text-ink">Why recruiters choose AXIOM</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-ash-border bg-white p-5">
                <Icon size={20} className="text-ink" />
                <h3 className="mt-3 font-display text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-2xl bg-ink px-6 py-10 text-white">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold">ATS integrations</h2>
              <p className="mt-3 text-base text-white/70">
                Connect AXIOM with your existing ATS. Sync candidates, post jobs,
                and track hires in one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {INTEGRATIONS.map(({ name, status }) => (
                  <span
                    key={name}
                    className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs"
                  >
                    {name}
                    <span className={status === "API available" ? "text-purple-400" : "text-white/40"}>
                      {status}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div className="text-center lg:text-right">
              <Link
                to="/recruiter/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ash"
              >
                Get API access <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-ink">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {STEPS.map(({ num, title, body }) => (
              <div key={num} className="text-center">
                <p className="font-display text-4xl font-bold text-ink/20">{num}</p>
                <h3 className="mt-2 font-medium text-ink">{title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-xl border border-ash-border bg-ash/30 p-6">
          <div className="grid gap-6 lg:grid-cols-3 lg:items-center">
            <div className="lg:col-span-2">
              <h2 className="font-display text-xl font-bold text-ink">Ready to hire better?</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Join thousands of recruiters finding talent on AXIOM.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/recruiter/register" className="btn-primary">
                Create free account
              </Link>
              <Link to="/why-axiom" className="btn-ghost">
                Why AXIOM?
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}