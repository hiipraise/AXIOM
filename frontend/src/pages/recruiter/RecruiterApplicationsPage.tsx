import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import toast from "react-hot-toast";
import { axiomApplicationsApi, liveInterviewApi } from "../../api";
import InterviewStageSelector from "../../components/interview/InterviewStageSelector";
import { useState } from "react";

export default function RecruiterApplicationsPage() {
  const qc = useQueryClient();
  const [modeById, setModeById] = useState<Record<string, string>>({});
  const { data = [] } = useQuery({ queryKey: ["employer-applications"], queryFn: axiomApplicationsApi.employer });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => axiomApplicationsApi.updateStatus(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employer-applications"] }),
  });
  const scheduleMutation = useMutation({
    mutationFn: (id: string) => liveInterviewApi.schedule({ application_id: id, session_type: modeById[id] || "live_manual", duration_minutes: 30 }),
    onSuccess: () => {
      toast.success("Interview scheduled");
      qc.invalidateQueries({ queryKey: ["employer-applications"] });
    },
    onError: () => toast.error("Could not schedule interview"),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Recruiter</p>
        <h1 className="font-display text-3xl font-bold text-ink">Applications</h1>
      </div>
      <div className="space-y-4">
        {data.map((app) => (
          <article key={app.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-ink">{app.job?.title || "AXIOM job"}</p>
                <p className="text-sm text-ink-muted">Candidate {app.candidate_id.slice(-6)} · {app.status.replace("_", " ")}</p>
              </div>
              <select className="input max-w-[220px]" value={app.status} onChange={(event) => statusMutation.mutate({ id: app.id, status: event.target.value })}>
                {["applied", "reviewed", "shortlisted", "rejected", "offered"].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
              </select>
            </div>
            {app.cover_letter && <p className="mt-3 rounded-lg bg-ash p-3 text-sm text-ink-muted line-clamp-4">{app.cover_letter}</p>}
            <div className="mt-4 grid gap-3 md:grid-cols-[240px_auto]">
              <InterviewStageSelector value={modeById[app.id] || "live_manual"} onChange={(value) => setModeById({ ...modeById, [app.id]: value })} />
              <button className="btn-primary justify-center" onClick={() => scheduleMutation.mutate(app.id)}>
                <CalendarClock size={15} /> Schedule interview
              </button>
            </div>
          </article>
        ))}
        {!data.length && <div className="card text-center text-sm text-ink-muted">No AXIOM applications yet.</div>}
      </div>
    </div>
  );
}
