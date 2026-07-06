import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Wallet, Shield, Eye, Briefcase } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Footer, Navbar } from "../../components/landing";
import ContactModal from "../../components/landing/ContactModal";
import Seo from "../../components/Seo";

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

interface FAQSection {
  title: string;
  icon: LucideIcon;
  items: FAQItem[];
}

function Accordion({ items }: { items: FAQItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="divide-y divide-ash-border rounded-xl border border-ash-border bg-white">
      {items.map((item, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium text-ink hover:bg-ash/40 transition-colors"
            >
              <span>{item.q}</span>
              <ChevronDown
                size={15}
                className={`shrink-0 text-ink-muted transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 text-sm text-ink-muted leading-relaxed">
                    {item.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

const SECTIONS: FAQSection[] = [
  {
    title: "Free platform",
    icon: Wallet,
    items: [
      {
        q: "Is AXIOM really free?",
        a: (
          <span>
            Yes — every feature is free. There are no paid plans, no tiers, and
            no trials. You can create CVs, browse jobs, get AI match scores,
            generate cover letters, save jobs, and practise interviews without
            paying anything.
          </span>
        ),
      },
      {
        q: "Are there any usage limits?",
        a: (
          <span>
            No paid tiers — every feature is included for free. You can create
            as many CVs as you want and save unlimited jobs. AI features
            (reviews, match scores, cover letters, and interview practice) have
            rate limits to keep API costs manageable, but they reset regularly
            and are set generously enough for regular use.
          </span>
        ),
      },
      {
        q: "Will AXIOM ever charge for features?",
        a: (
          <span>
            There are no current plans to charge. If that ever changes, existing
            users will be grandfathered or given plenty of notice. The platform
            is maintained as a career tool, not a subscription business.
          </span>
        ),
      },
      {
        q: "Do I need a credit card to sign up?",
        a: (
          <span>
            No — you don't even need an email. Register with just a username and
            password. Email is optional and only used for account recovery if
            you choose to provide it.
          </span>
        ),
      },
    ],
  },
  {
    title: "Account & recovery",
    icon: Shield,
    items: [
      {
        q: "How do I recover my account if I forget my password?",
        a: (
          <span>
            Visit the{" "}
            <Link
              to="/forgot"
              className="text-ink underline hover:no-underline"
            >
              account recovery page
            </Link>
            . You'll need your username and the answer to the secret question
            you chose during registration. If you also provided an email, you
            can use it to look up your username first.
          </span>
        ),
      },
      {
        q: "I forgot my username — what can I do?",
        a: (
          <span>
            If you provided an email during registration, enter it on the{" "}
            <Link
              to="/forgot"
              className="text-ink underline hover:no-underline"
            >
              recovery page
            </Link>{" "}
            and we'll send your username. If you didn't add an email, the secret
            question answer can still reset your password — but you'll need to
            remember your username.
          </span>
        ),
      },
      {
        q: "Can I change my secret question or email later?",
        a: (
          <span>
            Yes. Go to your{" "}
            <Link
              to="/account"
              className="text-ink underline hover:no-underline"
            >
              Account settings
            </Link>{" "}
            to update your email, secret question, or answer at any time.
          </span>
        ),
      },
    ],
  },
  {
    title: "CV privacy & sharing",
    icon: Eye,
    items: [
      {
        q: "Who can see my CVs?",
        a: (
          <span>
            By default every CV is private — only you can see it. You can toggle
            a CV to <strong>public</strong> in the editor, which generates a
            shareable link with a unique slug. Public CVs are visible to anyone
            with the link, and appear on your public profile page if you have
            one.
          </span>
        ),
      },
      {
        q: "Are public CVs indexed by search engines?",
        a: (
          <span>
            No. Public CV pages include a <code>noindex</code> meta tag, so
            search engines will not index them. They are only accessible to
            people who have the direct link or visit your public profile.
          </span>
        ),
      },
      {
        q: "Can I delete a CV permanently?",
        a: (
          <span>
            Yes. From your dashboard, open the CV menu and choose "Delete". This
            permanently removes the CV and its version history. There is no
            undo, so consider duplicating it first if you might want it back.
          </span>
        ),
      },
      {
        q: "What data does AXIOM store about me?",
        a: (
          <span>
            AXIOM stores your CV data, saved jobs, interview session history,
            and account details. You can download all your data as a JSON file
            from Account settings, or delete your account entirely, which
            removes all associated data. See the{" "}
            <Link
              to="/terms-privacy"
              className="text-ink underline hover:no-underline"
            >
              Terms & Privacy
            </Link>{" "}
            page for full details.
          </span>
        ),
      },
    ],
  },
  {
    title: "Job sources & matching",
    icon: Briefcase,
    items: [
      {
        q: "Where do the jobs on AXIOM come from?",
        a: (
          <span>
            Jobs are aggregated from multiple external sources including Adzuna
            and Remotive. AXIOM does not host job listings directly — the board
            indexes roles from these partners so you can search them all in one
            place. Each listing links to the original posting for applications.
          </span>
        ),
      },
      {
        q: "How does the AI match score work?",
        a: (
          <span>
            The AI compares your CV data against a job description and scores it
            across multiple dimensions. It identifies which keywords from the
            job posting are present in your CV and which are missing, then gives
            you a match percentage with a breakdown of what to improve. The
            score is a guide, not a guarantee — use it to prioritise which roles
            to tailor your CV for.
          </span>
        ),
      },
      {
        q: "Can I apply to jobs directly on AXIOM?",
        a: (
          <span>
            No — all applications are handled on the original job board or
            company website. AXIOM helps you prepare: you can tailor your CV to
            the role, generate a cover letter, and save jobs for later review.
          </span>
        ),
      },
      {
        q: "What does Saved Jobs do?",
        a: (
          <span>
            Saved Jobs lets you bookmark roles you want to revisit later. It is
            a personal list of jobs you have saved from the job board, not a
            stage-based application tracker.
          </span>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  const [showContact, setShowContact] = useState(false);

  return (
    <>
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    <div className="min-h-screen bg-white">
      <Seo
        title="Frequently Asked Questions"
        description="Answers to common questions about AXIOM's free platform, account recovery, CV privacy, and job sources."
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-28">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">
          FAQ
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-4 text-sm leading-7 text-ink-muted">
          Quick answers to the most common questions about AXIOM.
        </p>

        <div className="mt-12 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
                <section.icon size={18} className="text-ink-muted" />
                {section.title}
              </h2>
              <Accordion items={section.items} />
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-ash-border bg-ash/40 p-6 text-center">
          <p className="text-sm text-ink-muted">
            Still have questions?{" "}
            <button
              onClick={() => setShowContact(true)}
              className="text-ink font-medium underline hover:no-underline cursor-pointer"
            >
              Email us
            </button>{" "}
            or use the feedback widget at the bottom of the page.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link to="/register" className="btn-primary">
            Get started free
          </Link>
          <Link to="/about" className="btn-secondary">
            About AXIOM
          </Link>
        </div>
      </main>
      <Footer />
    </div>
    </>
  );
}
