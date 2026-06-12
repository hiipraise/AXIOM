import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Search, Trash2, Users, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { axiomApplicationsApi, recruiterApi } from "../../api";
import CvSnapshotModal from "../../components/recruiter/CvSnapshotModal";

export default function TalentPoolsPage() {
  const qc = useQueryClient();
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [newPool, setNewPool] = useState({ name: "", description: "" });
  const [viewingCv, setViewingCv] = useState<{
    snapshot: Record<string, unknown>;
    jobTitle?: string;
  } | null>(null);
  const [addMode, setAddMode] = useState(false);

  const pools = useQuery({
    queryKey: ["talent-pools"],
    queryFn: recruiterApi.talentPools,
  });

  const candidates = useQuery({
    queryKey: ["saved-candidates", selectedPoolId],
    queryFn: () => recruiterApi.savedCandidates(selectedPoolId || undefined),
  });

  // Get applications from AXIOM jobs for the current recruiter
  const applications = useQuery({
    queryKey: ["axiom-applications"],
    queryFn: () => axiomApplicationsApi.list(),
    enabled: addMode,
  });

  // Show only unsaved candidates when in add mode
  const unsavedCandidates = useMemo(() => {
    if (!applications.data) return [];
    const saved = candidates.data || [];
    const savedIds = new Set(saved.map((c) => c.application_id));
    return applications.data.filter((app) => !savedIds.has(app.id));
  }, [applications.data, candidates.data]);

  const createPool = useMutation({
    mutationFn: recruiterApi.createTalentPool,
    onSuccess: () => {
      toast.success("Pool created");
      setNewPool({ name: "", description: "" });
      qc.invalidateQueries({ queryKey: ["talent-pools"] });
    },
    onError: () => toast.error("Could not create pool"),
  });

  const updateCandidate = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      recruiterApi.updateSavedCandidate(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-candidates"] });
      qc.invalidateQueries({ queryKey: ["talent-pools"] });
    },
    onError: () => toast.error("Could not update candidate"),
  });

  const removeCandidate = useMutation({
    mutationFn: recruiterApi.deleteSavedCandidate,
    onSuccess: () => {
      toast.success("Candidate removed");
      qc.invalidateQueries({ queryKey: ["saved-candidates"] });
      qc.invalidateQueries({ queryKey: ["talent-pools"] });
    },
    onError: () => toast.error("Could not remove candidate"),
  });

  const addToPool = useMutation({
    mutationFn: ({ applicationId, poolId }: { applicationId: string; poolId?: string }) =>
      recruiterApi.saveCandidate({ application_id: applicationId, pool_id: poolId }),
    onSuccess: () => {
      toast.success("Candidate added to pool");
      qc.invalidateQueries({ queryKey: ["saved-candidates"] });
      qc.invalidateQueries({ queryKey: ["talent-pools"] });
    },
    onError: () => toast.error("Could not add candidate"),
  });

  const totalSaved = useMemo(
    () => (candidates.data || []).length,
    [candidates.data],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
            Recruiter mode
          </p>
          <h1 className="font-display text-3xl font-bold text-ink">
            Talent pools
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-ash-border px-3 py-2 text-sm text-ink-muted">
          <Users size={16} />
          {totalSaved} saved profiles
        </div>
        <button
          className="btn-secondary !px-3 !py-1.5 !text-xs"
          onClick={() => setAddMode(!addMode)}
        >
          <UserPlus size={13} />
          {addMode ? "Done" : "Add candidates"}
        </button>
      </div>

      {addMode && (
        <div className="card">
          <h2 className="font-display text-lg font-bold text-ink mb-3">
            Add candidates to pool
          </h2>
          <p className="text-sm text-ink-muted mb-3">
            Select a pool on the left, then add candidates.
          </p>
          {selectedPoolId ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {unsavedCandidates.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between py-2 border-b border-ash-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      Candidate {app.candidate_id.slice(-6)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {app.job?.title}
                    </p>
                  </div>
                  <button
                    className="btn-ghost !px-2 !py-1 !text-xs"
                    onClick={() =>
                      addToPool.mutate({
                        applicationId: app.id,
                        poolId: selectedPoolId,
                      })
                    }
                    disabled={addToPool.isPending}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
              ))}
              {unsavedCandidates.length === 0 && (
                <p className="text-sm text-ink-muted py-4 text-center">
                  No new candidates to add. All applicants may already be saved.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              Select a pool first to add candidates.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <section className="card">
            <h2 className="font-display text-lg font-bold text-ink">
              Create pool
            </h2>
            <div className="mt-3 space-y-3">
              <input
                className="input"
                placeholder="Pool name"
                value={newPool.name}
                onChange={(e) =>
                  setNewPool({ ...newPool, name: e.target.value })
                }
              />
              <textarea
                className="input min-h-[88px]"
                placeholder="Description"
                value={newPool.description}
                onChange={(e) =>
                  setNewPool({ ...newPool, description: e.target.value })
                }
              />
              <button
                className="btn-primary w-full justify-center"
                disabled={createPool.isPending || newPool.name.trim().length < 2}
                onClick={() => createPool.mutate(newPool)}
              >
                <Plus size={15} /> Create pool
              </button>
            </div>
          </section>

          <section className="card">
            <h2 className="mb-3 font-display text-lg font-bold text-ink">
              Pools
            </h2>
            <div className="space-y-2">
              <button
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedPoolId === ""
                    ? "border-ink bg-ink text-white"
                    : "border-ash-border text-ink hover:bg-ash"
                }`}
                onClick={() => setSelectedPoolId("")}
              >
                All saved candidates
              </button>
              {(pools.data || []).map((pool) => (
                <button
                  key={pool.id}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedPoolId === pool.id
                      ? "border-ink bg-ink text-white"
                      : "border-ash-border text-ink hover:bg-ash"
                  }`}
                  onClick={() => setSelectedPoolId(pool.id)}
                >
                  <span className="block font-medium">{pool.name}</span>
                  <span className="text-xs opacity-75">
                    {pool.candidate_count} candidates
                  </span>
                </button>
              ))}
              {!pools.data?.length && (
                <p className="py-3 text-sm text-ink-muted">
                  Create a pool, then save applicants into it from Applications.
                </p>
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          {(candidates.data || []).map((candidate) => (
            <article key={candidate.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">
                    {candidate.candidate_name ||
                      `Candidate ${candidate.candidate_id.slice(-6)}`}
                  </h2>
                  <p className="text-sm text-ink-muted">
                    {candidate.candidate_title || "Candidate profile"}
                    {candidate.candidate_location
                      ? ` · ${candidate.candidate_location}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Source: {candidate.source_job_title || "AXIOM application"} ·{" "}
                    {candidate.status.replace("_", " ")}
                  </p>
                </div>
                <button
                  className="btn-ghost !px-3 !py-1.5 !text-xs text-red-600"
                  onClick={() => removeCandidate.mutate(candidate.id)}
                  disabled={removeCandidate.isPending}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {candidate.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {candidate.skills.slice(0, 10).map((skill) => (
                    <span key={skill} className="badge bg-ash text-ink">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
                <div>
                  <label className="label">Pool</label>
                  <select
                    className="input"
                    value={candidate.pool_id || ""}
                    onChange={(e) =>
                      updateCandidate.mutate({
                        id: candidate.id,
                        body: { pool_id: e.target.value || null },
                      })
                    }
                  >
                    <option value="">Saved candidates</option>
                    {(pools.data || []).map((pool) => (
                      <option key={pool.id} value={pool.id}>
                        {pool.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Recruiter notes</label>
                  <textarea
                    className="input min-h-[84px]"
                    defaultValue={candidate.notes}
                    onBlur={(e) =>
                      updateCandidate.mutate({
                        id: candidate.id,
                        body: { notes: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              {candidate.cv_snapshot?.data && (
                <button
                  className="btn-secondary mt-3 !px-3 !py-1.5 !text-xs"
                  onClick={() =>
                    setViewingCv({
                      snapshot: candidate.cv_snapshot!.data as Record<
                        string,
                        unknown
                      >,
                      jobTitle: candidate.source_job_title,
                    })
                  }
                >
                  <FileText size={13} /> View saved CV snapshot
                </button>
              )}
            </article>
          ))}

          {!candidates.isLoading && !candidates.data?.length && (
            <div className="card text-center text-sm text-ink-muted">
              No saved profiles in this pool yet.
            </div>
          )}
        </section>
      </div>

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
