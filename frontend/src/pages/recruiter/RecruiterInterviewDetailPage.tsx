import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Target, Video } from "lucide-react";
import { recruiterApi } from "../../api";
import { InterviewFeedback, RecruiterInterviewDetail } from "../../types";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="badge bg-ash">No score</span>;
  const color =
    score >= 80
      ? "bg-green-500"
      : score >= 60
      ? "bg-amber-500"
      : "bg-red-500";
  return <span className={`badge ${color} text-white`}>{score}/100</span>;
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-ash px-3 py-1 text-xs text-ink-muted">
      {label}: <b className="text-ink">{value}/10</b>
    </span>
  );
}

function FeedbackCard({ feedback }: { feedback: InterviewFeedback }) {
  return (
    <div className="mt-3 rounded-2xl border border-ash-border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="badge bg-ink text-white">
          Overall {feedback.overall_score}/100
        </span>
        <ScorePill label="Clarity" value={feedback.score.clarity} />
        <ScorePill label="Specificity" value={feedback.score.specificity} />
        <ScorePill label="Evidence" value={feedback.score.evidence} />
        <ScorePill label="Length" value={feedback.score.length} />
      </div>
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <p>
          <b className="text-ink">Strong:</b>{" "}
          <span className="text-ink-muted">{feedback.what_was_strong}</span>
        </p>
        <p>
          <b className="text-ink">Vague:</b>{" "}
          <span className="text-ink-muted">{feedback.what_was_vague}</span>
        </p>
        <p>
          <b className="text-ink">Recruiter hears:</b>{" "}
          <span className="text-ink-muted">{feedback.recruiter_takeaway}</span>
        </p>
        <p>
          <b className="text-ink">Improve:</b>{" "}
          <span className="text-ink-muted">{feedback.suggested_improvement}</span>
        </p>
      </div>
    </div>
  );
}

export default function RecruiterInterviewDetailPage() {
  const { candidateId = "", sessionId = "" } = useParams();
  const navigate = useNavigate();

  // If we have a sessionId, show that specific session
  // Otherwise show list of sessions for this candidate
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["candidate-interviews", candidateId],
    queryFn: () => recruiterApi.candidateInterviews(candidateId),
    enabled: !sessionId,
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["interview-detail", candidateId, sessionId],
    queryFn: () => recruiterApi.interviewDetail(candidateId, sessionId),
    enabled: !!sessionId,
  });

  // Show session list view
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-ash">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <button
            className="btn-ghost mb-4"
            onClick={() => navigate("/recruiter/interviews")}
          >
            <ArrowLeft size={14} /> Back to candidates
          </button>
          <h1 className="font-display text-2xl font-bold text-ink">
            {sessions?.candidate_name || "Candidate"} Interview Sessions
          </h1>

          <div className="mt-6 space-y-4">
            {sessions?.sessions.map((session) => (
              <Link
                key={session.session_id}
                to={`/recruiter/interviews/${candidateId}/${session.session_id}`}
                className="block rounded-2xl border border-ash-border bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-ink">{session.job_title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      {session.company} · {session.mode}
                    </p>
                  </div>
                  <ScoreBadge score={session.overall_score} />
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-ink-muted">
                  <span className="flex items-center gap-1">
                    <Target size={14} />
                    {session.question_count} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {session.created_at
                      ? new Date(session.created_at).toLocaleDateString()
                      : "No date"}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {!loadingSessions &&
            (!sessions?.sessions || sessions.sessions.length === 0) && (
              <div className="mt-12 text-center text-ink-muted">
                <Video size={48} className="mx-auto opacity-30" />
                <p className="mt-4">No completed interviews found</p>
              </div>
            )}
        </div>
      </div>
    );
  }

  // Show detailed session view
  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <button
          className="btn-ghost mb-4"
          onClick={() => navigate(`/recruiter/interviews/${candidateId}`)}
        >
          <ArrowLeft size={14} /> Back to sessions
        </button>

        {loadingDetail ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="mb-6 rounded-2xl border border-ash-border bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-ink">
                    {detail?.job_title}
                  </h1>
                  <p className="mt-1 text-ink-muted">
                    {detail?.candidate_name} · {detail?.company}
                  </p>
                </div>
                <ScoreBadge score={detail?.overall_score ?? null} />
              </div>
            </div>

            {detail?.summary && (
              <div className="mb-6 rounded-2xl border border-ash-border bg-white p-5">
                <h2 className="font-medium text-ink">AI Summary</h2>
                <p className="mt-2 text-sm text-ink-muted">{detail.summary}</p>
              </div>
            )}

            <div className="space-y-4">
              {detail?.messages.map((msg, i) => (
                <article
                  key={msg.id || i}
                  className="rounded-2xl border border-ash-border bg-white p-5"
                >
                  <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink-muted">
                    <Target size={13} /> Question {i + 1}
                  </p>
                  <p className="text-lg font-medium leading-7 text-ink">
                    {msg.question}
                  </p>
                  {msg.answer && (
                    <div className="mt-4 rounded-xl bg-ash p-4 text-sm leading-6 text-ink">
                      <b>Answer:</b> {msg.answer}
                    </div>
                  )}
                  {msg.feedback && <FeedbackCard feedback={msg.feedback} />}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}