import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, CalendarClock, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { axiomApplicationsApi, liveInterviewApi, recruiterApi } from "../../api";
import InterviewStageSelector from "../../components/interview/InterviewStageSelector";
import CoverLetterModal from "../../components/jobs/CoverLetterModal";
import CvSnapshotModal from "../../components/recruiter/CvSnapshotModal";
import { useState } from "react";

export default function RecruiterApplicationsPage() {
  const qc = useQueryClient();
  const [modeById, setModeById] = useState<Record<string, string>>({});
  const [scheduleById, setScheduleById] = useState<
    Record<string, { date: string; time: string; duration: string }>
  >({});
  const [viewingCoverLetter, setViewingCoverLetter] = useState<{
    text: string;
    title: string;
  } | null>(null);
  const [viewingCv, setViewingCv] = useState<{
    snapshot: Record<string, unknown>;
    candidateName?: string;
    jobTitle?: string;
  } | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["employer-applications"],
    queryFn: axiomApplicationsApi.employer,
  });

  const { data: pools = [] } = useQuery({
    queryKey: ["talent-pools"],
    queryFn: recruiterApi.talentPools,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axiomApplicationsApi.updateStatus(id, { status }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["employer-applications"] }),
  });

  const scheduleMutation = useMutation({
    mutationFn: (id: string) => {
      const schedule = scheduleById[id] || {
        date: "",
        time: "",
        duration: "30",
      };
      const scheduledAt =
        schedule.date && schedule.time
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

  const saveCandidateMutation = useMutation({
    mutationFn: ({ applicationId, poolId }: { applicationId: string; poolId?: string }) =>
      recruiterApi.saveCandidate({ application_id: applicationId, pool_id: poolId || null }),
    onSuccess: () => {
      toast.success("Candidate saved");
      qc.invalidateQueries({ queryKey: ["saved-candidates"] });
      qc.invalidateQueries({ queryKey: ["talent-pools"] });
    },
    onError: () => toast.error("Could not save candidate"),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
          Recruiter
        </p>
        <h1 className="font-display text-3xl font-bold text-ink">
          Applications
        </h1>
      </div>

      <div className="space-y-4">
        {data.map((app) => (
          <article key={app.id} className="card">
            {(() => {
              const schedule = scheduleById[app.id] || {
                date: "",
                time: "",
                duration: "30",
              };
              const patchSchedule = (patch: Partial<typeof schedule>) =>
                setScheduleById((current) => ({
                  ...current,
                  [app.id]: { ...schedule, ...patch },
                }));

              return (
                <>
                  {/* Title + status */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">
                        {app.job?.title || "AXIOM job"}
                      </p>
                      <p className="text-sm text-ink-muted">
                        Candidate {app.candidate_id.slice(-6)} ·{" "}
                        {app.status.replace("_", " ")}
                      </p>
                    </div>
                    <select
                      className="input max-w-[220px]"
                      value={app.status}
                      onChange={(e) =>
                        statusMutation.mutate({
                          id: app.id,
                          status: e.target.value,
                        })
                      }
                    >
                      {[
                        "applied",
                        "reviewed",
                        "shortlisted",
                        "rejected",
                        "offered",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cover letter preview */}
                  {app.cover_letter && (
                    <div className="mt-3 rounded-lg bg-ash p-3">
                      <p className="text-sm text-ink-muted line-clamp-3">
                        {app.cover_letter}
                      </p>
                      {app.cover_letter.length > 200 && (
                        <button
                          className="mt-1 text-xs text-ink underline"
                          onClick={() =>
                            setViewingCoverLetter({
                              text: app.cover_letter,
                              title: app.job?.title || "Application",
                            })
                          }
                        >
                          Read full cover letter
                        </button>
                      )}
                    </div>
                  )}

                  {/* CV snapshot button */}
                  {app.cv_snapshot?.data && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        className="btn-secondary !px-3 !py-1.5 !text-xs"
                        onClick={() =>
                          setViewingCv({
                            snapshot: app.cv_snapshot!.data as Record<
                              string,
                              unknown
                            >,
                            jobTitle: app.job?.title,
                          })
                        }
                      >
                        <FileText size={13} /> View CV snapshot
                      </button>
                      <select
                        className="input max-w-[220px] !py-1.5 !text-xs"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            saveCandidateMutation.mutate({
                              applicationId: app.id,
                              poolId: e.target.value === "none" ? undefined : e.target.value,
                            });
                            e.currentTarget.value = "";
                          }
                        }}
                      >
                        <option value="">Save to pool...</option>
                        <option value="none">Saved candidates</option>
                        {pools.map((pool) => (
                          <option key={pool.id} value={pool.id}>
                            {pool.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn-ghost !px-3 !py-1.5 !text-xs"
                        onClick={() =>
                          saveCandidateMutation.mutate({ applicationId: app.id })
                        }
                        disabled={saveCandidateMutation.isPending}
                      >
                        <BookmarkPlus size={13} /> Save profile
                      </button>
                    </div>
                  )}

                  {/* Interview scheduling */}
                  <div className="mt-4 grid gap-3 md:grid-cols-[240px_1fr_1fr_140px]">
                    <InterviewStageSelector
                      value={modeById[app.id] || "live_manual"}
                      onChange={(value) =>
                        setModeById({ ...modeById, [app.id]: value })
                      }
                    />
                    <div>
                      <label className="label">Interview date</label>
                      <input
                        className="input"
                        type="date"
                        value={schedule.date}
                        onChange={(e) =>
                          patchSchedule({ date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Time</label>
                      <input
                        className="input"
                        type="time"
                        value={schedule.time}
                        onChange={(e) =>
                          patchSchedule({ time: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Minutes</label>
                      <select
                        className="input"
                        value={schedule.duration}
                        onChange={(e) =>
                          patchSchedule({ duration: e.target.value })
                        }
                      >
                        {[15, 30, 45, 60, 90, 120].map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      className="btn-primary justify-center"
                      onClick={() => scheduleMutation.mutate(app.id)}
                      disabled={
                        scheduleMutation.isPending ||
                        !schedule.date ||
                        !schedule.time
                      }
                    >
                      <CalendarClock size={15} /> Schedule interview
                    </button>
                  </div>
                </>
              );
            })()}
          </article>
        ))}
        {!data.length && (
          <div className="card text-center text-sm text-ink-muted">
            No AXIOM applications yet.
          </div>
        )}
      </div>

      {/* Cover letter modal */}
      {viewingCoverLetter && (
        <CoverLetterModal
          open
          letter={viewingCoverLetter.text}
          title={viewingCoverLetter.title}
          onClose={() => setViewingCoverLetter(null)}
        />
      )}

      {/* CV snapshot modal */}
      {viewingCv && (
        <CvSnapshotModal
          open
          snapshot={viewingCv.snapshot}
          jobTitle={viewingCv.jobTitle}
          onClose={() => setViewingCv(null)}
        />
      )}
    </div>
  );
}
