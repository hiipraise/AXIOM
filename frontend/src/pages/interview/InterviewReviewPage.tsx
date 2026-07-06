import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RotateCcw, Trophy, Brain, BarChart3, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { interviewApi } from "../../api";
import { InterviewFeedback as FeedbackType, InterviewSessionDetail } from "../../types";
import SpacedRepetitionPanel from "../../components/interview/SpacedRepetitionPanel";
import TopicHeatmap from "../../components/interview/TopicHeatmap";
import ShareResultsModal from "../../components/interview/ShareResultsModal";


function FeedbackSnapshot({ feedback }: { feedback: FeedbackType }) {
  return (
    <div className="mt-3 rounded-2xl border border-ash-border p-4 text-sm">
      <div className="mb-2 font-medium text-ink">Score: {feedback.overall_score}/100</div>
      <p className="text-ink-muted"><b className="text-ink">Strong:</b> {feedback.what_was_strong}</p>
      <p className="mt-1 text-ink-muted"><b className="text-ink">Improve:</b> {feedback.suggested_improvement}</p>
    </div>
  );
}
import Seo from "../../components/Seo";

export default function InterviewReviewPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showReviewCards, setShowReviewCards] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const generateCards = useMutation({
    mutationFn: () => interviewApi.generateReviewCards(sessionId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['review-cards'] });
      qc.invalidateQueries({ queryKey: ['review-card-stats'] });
      setShowReviewCards(true);
    },
    onError: () => toast.error('No answered questions to generate cards from'),
  });

  const { data: session, isLoading } = useQuery<InterviewSessionDetail>({
    queryKey: ["interview-session", sessionId],
    queryFn: () => interviewApi.session(sessionId),
    enabled: !!sessionId,
  });

  if (isLoading || !session) return <div className="p-8">Loading review...</div>;

  return (
    <div className="min-h-screen bg-ash">
      <Seo title="Interview Review" noindex />
      <div className="mx-auto max-w-4xl px-4 py-6 lg:py-10">
        <button className="btn-ghost mb-4" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</button>
        <section className="rounded-3xl bg-ink p-8 text-white">
          <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/60"><Trophy size={15} /> Session review</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">{session.summary?.overall_score ?? session.overall_score ?? "—"}/100</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">{session.summary?.summary || "Complete the session to generate a final review."}</p>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="card">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Weakest area</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">{session.summary?.weakest_area || "Not scored yet"}</h2>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Top improvements</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              {(session.summary?.top_3_improvements || []).map((item) => <li key={item}>• {item}</li>)}
              {(!session.summary?.top_3_improvements || session.summary.top_3_improvements.length === 0) && <li>Finish all questions to unlock recommendations.</li>}
            </ul>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {session.messages.map((message, index) => (
            <article key={message.id} className="card">
              <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Question {index + 1}</p>
              <h3 className="mt-2 font-medium text-ink">{message.question}</h3>
              <p className="mt-3 rounded-2xl bg-ash p-4 text-sm text-ink-muted">{message.answer || "No answer recorded."}</p>
              {message.feedback && <FeedbackSnapshot feedback={message.feedback} />}
            </article>
          ))}
        </div>

        {/* ── Review cards & Heatmap ── */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted flex items-center gap-1.5">
                <Brain size={13} /> Flashcard review
              </p>
              <button
                onClick={() => generateCards.mutate()}
                disabled={generateCards.isPending}
                className="text-[11px] text-ink underline hover:text-ink-muted disabled:opacity-50"
              >
                {generateCards.isPending ? 'Generating...' : 'Generate cards'}
              </button>
            </div>
            {showReviewCards || generateCards.isSuccess ? (
              <SpacedRepetitionPanel />
            ) : (
              <p className="text-xs text-ink-muted">Generate flashcards from this session to review key questions later.</p>
            )}
          </div>
          <div className="card">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-ink-muted"
            >
              <BarChart3 size={13} /> Topic heatmap
            </button>
            {showHeatmap ? (
              <div className="mt-3">
                <TopicHeatmap />
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">Click to show your topic performance across all sessions.</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/interview" className="btn-primary"><RotateCcw size={15} /> Practise another role</Link>
          {/* 9a: Retry the exact same role — pre-fills cv + job on the start page */}
          <button
            className="btn-secondary"
            onClick={() =>
              navigate(`/interview/start?cv=${session.cv_id}&job=${session.job_id || ""}`)
            }
          >
            <RotateCcw size={15} /> Retry this role
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="btn-ghost"
          >
            <Share2 size={15} /> Share results
          </button>
          <Link to={`/interview/${session.id}`} className="btn-ghost">View transcript</Link>
        </div>
      </div>

      {showShareModal && (
        <ShareResultsModal
          session={session}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}