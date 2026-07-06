import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { interviewApi } from "../../api";
import {
  Trophy,
  Brain,
  AlertCircle,
  Target,
  MessageSquare,
  Star,
} from "lucide-react";
import Seo from "../../components/Seo";

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-ash px-3 py-1 text-xs text-ink-muted">
      {label}: <b className="text-ink">{value}/10</b>
    </span>
  );
}

export default function SharedInterviewPage() {
  const { shareToken = "" } = useParams();

  const { data: shared, isLoading, isError } = useQuery({
    queryKey: ["shared-interview", shareToken],
    queryFn: () => interviewApi.getSharedSession(shareToken),
    enabled: !!shareToken,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ash flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !shared) {
    return (
      <div className="min-h-screen bg-ash flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle size={40} className="mx-auto text-ink-muted mb-4" />
          <h1 className="font-display text-xl font-bold text-ink mb-2">Shared interview not found</h1>
          <p className="text-sm text-ink-muted">
            This share link may have been revoked or the session no longer exists.
          </p>
        </div>
      </div>
    );
  }

  const messages = shared.messages || [];

  return (
    <div className="min-h-screen bg-ash">
      <Seo title={`Interview: ${shared.job_title || "Results"}`} noindex />
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header section */}
        <section className="rounded-3xl bg-gradient-to-br from-ink to-gray-800 p-8 text-white">
          <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/60">
            <Trophy size={15} /> Shared Interview Results
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {shared.job_title || "Mock interview"}
          </h1>
          {shared.company && (
            <p className="mt-1 text-sm text-white/70">{shared.company}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div>
              <p className="text-4xl font-bold">{shared.overall_score ?? "—"}/100</p>
              <p className="text-xs text-white/60 mt-1">Overall score</p>
            </div>
            <div className="text-sm text-white/70 space-y-1">
              <p className="capitalize">{shared.mode} mode</p>
              <p>{shared.answered_count}/{shared.question_count} questions answered</p>
            </div>
          </div>
        </section>

        {/* Summary */}
        {shared.summary?.summary && (
          <div className="mt-6 card">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted mb-2">
              <Star size={13} /> Summary
            </p>
            <p className="text-sm text-ink-muted leading-relaxed">{shared.summary.summary}</p>
          </div>
        )}

        {/* Weakest area & improvements */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {shared.summary?.weakest_area && (
            <div className="card">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Area to improve</p>
              <p className="mt-2 font-semibold text-ink">{shared.summary.weakest_area}</p>
            </div>
          )}
          {shared.summary?.top_3_improvements && shared.summary.top_3_improvements.length > 0 && (
            <div className="card">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Top improvements</p>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
                {shared.summary.top_3_improvements.map((item: string, i: number) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Messages / transcript */}
        <div className="mt-6 space-y-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
            <MessageSquare size={13} /> Transcript
          </p>
          {messages.length === 0 ? (
            <p className="text-sm text-ink-muted">No answers recorded.</p>
          ) : (
            messages.map((message: import("../../types").InterviewMessage, index: number) => (
              <article key={message.id || index} className="card">
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink-muted mb-1">
                  <Target size={13} /> Question {index + 1}
                </p>
                <h3 className="font-medium text-ink text-base">{message.question}</h3>
                {message.answer && (
                  <div className="mt-3 rounded-2xl bg-ash p-4">
                    <p className="text-[11px] text-ink-muted font-medium mb-1">Answer:</p>
                    <p className="text-sm text-ink-muted leading-relaxed">{message.answer}</p>
                  </div>
                )}
                {message.feedback && (
                  <div className="mt-3 rounded-2xl border border-ash-border p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="badge bg-ink text-white">Overall {message.feedback.overall_score}/100</span>
                      <ScorePill label="Clarity" value={message.feedback.score.clarity} />
                      <ScorePill label="Specificity" value={message.feedback.score.specificity} />
                      <ScorePill label="Evidence" value={message.feedback.score.evidence} />
                      <ScorePill label="Length" value={message.feedback.score.length} />
                    </div>
                    <p className="text-sm text-ink-muted">
                      <b className="text-ink">Strong:</b> {message.feedback.what_was_strong}
                    </p>
                    <p className="text-sm text-ink-muted mt-1">
                      <b className="text-ink">Improve:</b> {message.feedback.suggested_improvement}
                    </p>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        <p className="mt-8 text-center text-xs text-ink-muted">
          Powered by <b>AXIOM</b> Interview Prep
        </p>
      </div>
    </div>
  );
}
