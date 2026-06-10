import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import toast from "react-hot-toast";
import { axiomApplicationsApi, liveInterviewApi } from "../../api";
import InterviewStageSelector from "../../components/interview/InterviewStageSelector";
import { useState } from "react";

export default function RecruiterApplicationsPage() {
  const qc = useQueryClient();
  const [modeById, setModeById] = useState<Record<string, string>>({});
  const [scheduleById, setScheduleById] = useState<Record<string, { date: string; time: string; duration: string }>>({});
  const { data = [] } = useQuery({ queryKey: ["employer-applications"], queryFn: axiomApplicationsApi.employer });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => axiomApplicationsApi.updateStatus(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employer-applications"] }),
  });
  const scheduleMutation = useMutation({
    mutationFn: (id: string) => {
      const schedule = scheduleById[id] || { date: "", time: "", duration: "30" };
      const scheduledAt = schedule.date && schedule.time
        ? new Date(`${schedule.date}T${schedule.time}`).toISOString()
        : null;

      return liveInterviewApi.schedule({
        application_id: id,
        session_type: modeById[id] || "live_manual",
        scheduled_at: scheduledAt,
        duration_minutes: Number(schedule.duration || 30),
      });
    },
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
            {(() => {
              const schedule = scheduleById[app.id] || { date: "", time: "", duration: "30" };
              const patchSchedule = (patch: Partial<typeof schedule>) =>
                setScheduleById((current) => ({
                  ...current,
                  [app.id]: { ...schedule, ...patch },
                }));

              return (
                <>
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
            <div className="mt-4 grid gap-3 md:grid-cols-[240px_1fr_1fr_140px]">
              <InterviewStageSelector value={modeById[app.id] || "live_manual"} onChange={(value) => setModeById({ ...modeById, [app.id]: value })} />
              <div>
                <label className="label">Interview date</label>
                <input
                  className="input"
                  type="date"
                  value={schedule.date}
                  onChange={(event) => patchSchedule({ date: event.target.value })}
                />
              </div>
              <div>
                <label className="label">Time</label>
                <input
                  className="input"
                  type="time"
                  value={schedule.time}
                  onChange={(event) => patchSchedule({ time: event.target.value })}
                />
              </div>
              <div>
                <label className="label">Minutes</label>
                <select
                  className="input"
                  value={schedule.duration}
                  onChange={(event) => patchSchedule({ duration: event.target.value })}
                >
                  {[15, 30, 45, 60, 90, 120].map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                className="btn-primary justify-center"
                onClick={() => scheduleMutation.mutate(app.id)}
                disabled={scheduleMutation.isPending || !schedule.date || !schedule.time}
              >
                <CalendarClock size={15} /> Schedule interview
              </button>
            </div>
                </>
              );
            })()}
          </article>
        ))}
        {!data.length && <div className="card text-center text-sm text-ink-muted">No AXIOM applications yet.</div>}
      </div>
    </div>
  );
}
