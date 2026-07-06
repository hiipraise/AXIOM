import { useState } from "react";
import { Footer, Navbar } from "../../components/landing";
import ContactModal from "../../components/landing/ContactModal";
import Seo from "../../components/Seo";

export default function LegalPage() {
  const [showContact, setShowContact] = useState(false);

  return (
    <>
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    <div className="min-h-screen bg-white">
      <Seo title="Terms of Use & Privacy Policy" noindex />
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 pb-16 pt-28">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">Legal</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink">
          Terms of Use & Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-ink-muted">Last updated: June 10, 2026</p>

        <section className="mt-10 space-y-8 text-sm leading-7 text-ink-muted">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Terms of Use</h2>
            <p className="mt-3">
              AXIOM provides tools for CV creation, job discovery, application tracking,
              and interview preparation. Users are responsible for
              the accuracy of information they enter and submit through the platform.
            </p>
            <p className="mt-3">
              Do not use AXIOM to submit false, misleading, unlawful, abusive, or
              infringing content. We may limit or suspend access where use harms the
              platform, other users, or third-party services.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Privacy Policy</h2>
            <p className="mt-3">
              AXIOM stores account details, CV content, application records, interview
              records, feedback, and platform analytics needed to
              operate the service. Authentication cookies are HttpOnly where supported.
            </p>
            <p className="mt-3">
              Public CVs are visible to anyone with the link.
              Private workspace content requires authentication. Account deletion removes
              user-owned CVs and associated user data from core collections.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Contact</h2>
            <p className="mt-3">
              For privacy, support, or legal requests, contact AXIOM through{" "}
            <button
              onClick={() => setShowContact(true)}
              className="underline hover:no-underline cursor-pointer font-medium text-ink-muted hover:text-ink transition-colors"
            >
              our contact form
            </button>
            .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
    </>
  );
}
