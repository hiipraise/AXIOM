import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Video } from "lucide-react";
import { recruiterApi } from "../../api";
import { InterviewCandidate } from "../../types";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="badge bg-ash">No score</span>;
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  return <span className={`badge ${color} text-white`}>{score}/100</span>;
}

export default function RecruiterInterviewsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["interview-candidates"],
    queryFn: () => recruiterApi.listInterviewCandidates(50, 0),
  });

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-ink">
          Interview Candidates
        </h1>
        <p className="mt-1 text-ink-muted">
          Candidates who have completed mock interviews
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.candidates.map((candidate: InterviewCandidate) => (
            <Link
              key={candidate.candidate_id}
              to={`/recruiter/interviews/${candidate.candidate_id}`}
              className="block rounded-2xl border border-ash-border bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-ink">
                    {candidate.name || "Unnamed candidate"}
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {candidate.email || "No email"}
                  </p>
                </div>
                <ScoreBadge score={candidate.latest_score} />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-ink-muted">
                  <Video size={14} />
                  <span>
                    {candidate.session_count} session{candidate.session_count !== 1 ? "s" : ""}
                  </span>
                </div>
                {candidate.latest_job_title && (
                  <p className="text-ink-muted">
                    {candidate.latest_job_title}
                    {candidate.latest_company && ` at ${candidate.latest_company}`}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
                <Calendar size={12} />
                {candidate.latest_date
                  ? new Date(candidate.latest_date).toLocaleDateString()
                  : "No date"}
              </div>
            </Link>
          ))}
        </div>

        {!isLoading && (!data?.candidates || data.candidates.length === 0) && (
          <div className="mt-12 text-center text-ink-muted">
            <Video size={48} className="mx-auto opacity-30" />
            <p className="mt-4">No candidates have completed interviews yet</p>
            <p className="mt-1 text-sm">
              Candidates will appear here after completing mock interview sessions
            </p>
          </div>
        )}

        {isLoading && <div className="mt-12 text-center text-ink-muted">Loading...</div>}
      </div>
    </div>
  );
}