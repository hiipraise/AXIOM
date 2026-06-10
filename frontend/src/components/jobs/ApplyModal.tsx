import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { FileSignature, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { axiomApplicationsApi, jobsApi } from "../../api";
import { AxiomJob, CV } from "../../types";

interface ApplyModalProps {
  open: boolean;
  job: AxiomJob;
  cvs: CV[];
  onClose: () => void;
}

export default function ApplyModal({ open, job, cvs, onClose }: ApplyModalProps) {
  const qc = useQueryClient();
  const [cvId, setCvId] = useState(cvs[0]?.id || "");
  const [coverLetter, setCoverLetter] = useState("");
  const selectedCv = useMemo(() => cvs.find((cv) => cv.id === cvId) || cvs[0], [cvs, cvId]);

  const applyMutation = useMutation({
    mutationFn: () => axiomApplicationsApi.apply({ job_id: job.id, cv_id: selectedCv?.id, cover_letter: coverLetter }),
    onSuccess: async () => {
      toast.success("Application submitted");
      await qc.invalidateQueries({ queryKey: ["axiom-applications"] });
      onClose();
    },
    onError: (error) => {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null;
      toast.error(typeof detail === "string" ? detail : "Could not submit application");
    },
  });

  const coverMutation = useMutation({
    mutationFn: () => jobsApi.coverLetter(selectedCv?.data || {}, job.title, job.company_name, job.description),
    onSuccess: (data) => {
      setCoverLetter(data.cover_letter);
      toast.success("Cover letter drafted");
    },
    onError: () => toast.error("Could not draft cover letter"),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-ash-border bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Apply on AXIOM</p>
            <h2 className="font-display text-xl font-bold text-ink">{job.title}</h2>
            <p className="text-sm text-ink-muted">{job.company_name}</p>
          </div>
          <button className="btn-ghost p-2" onClick={onClose} aria-label="Close application dialog">
            <X size={16} />
          </button>
        </div>
        {cvs.length ? (
          <div className="space-y-4">
            <div>
              <label className="label">CV</label>
              <select className="input" value={selectedCv?.id || ""} onChange={(event) => setCvId(event.target.value)}>
                {cvs.map((cv) => <option key={cv.id} value={cv.id}>{cv.title}</option>)}
              </select>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="label mb-0">Cover letter</label>
                <button className="btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => coverMutation.mutate()} disabled={!selectedCv || coverMutation.isPending}>
                  <FileSignature size={13} /> {coverMutation.isPending ? "Drafting..." : "AI draft"}
                </button>
              </div>
              <textarea className="input min-h-[220px]" value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} />
            </div>
            <button className="btn-primary w-full justify-center" onClick={() => applyMutation.mutate()} disabled={!selectedCv || applyMutation.isPending}>
              <Send size={15} /> {applyMutation.isPending ? "Submitting..." : "Submit application"}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-ash-border bg-ash/50 p-4 text-sm text-ink-muted">
            Create a CV first, then return to apply.
          </div>
        )}
      </div>
    </div>
  );
}
