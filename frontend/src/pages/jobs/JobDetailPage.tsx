import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Copy,
  FileSignature,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { cvApi, jobsApi } from "../../api";
import { useAuthStore } from "../../store/auth";
import CoverLetterModal from "../../components/jobs/CoverLetterModal";
import { JobResult } from "../../types";

export default function JobDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [selectedCvId, setSelectedCvId] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [coverOpen, setCoverOpen] = useState(false);

  const { data: job, isLoading } = useQuery<JobResult>({
    queryKey: ["job", id],
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
  });

  const { data: cvs = [] } = useQuery({
    queryKey: ["cvs"],
    queryFn: cvApi.list,
    enabled: !!user,
  });

  const selectedCv = useMemo(
    () => cvs.find((cv) => cv.id === selectedCvId) || cvs[0],
    [cvs, selectedCvId],
  );

  const matchMutation = useMutation({
    mutationFn: () => jobsApi.matchCv(selectedCv?.data, job?.description || ""),
    onSuccess: (data) => {
      toast.success(`Match score ${data.match_percentage}%`);
      qc.setQueryData(["job-match", id], data);
    },
    onError: () => toast.error("Could not score this match"),
  });

  const coverMutation = useMutation({
    mutationFn: () =>
      jobsApi.coverLetter(
        selectedCv?.data,
        job?.title || "",
        job?.company || "",
        job?.description || "",
      ),
    onSuccess: (data) => {
      setCoverLetter(data.cover_letter);
      setCoverOpen(true);
      toast.success("Cover letter generated");
    },
    onError: () => toast.error("Could not generate cover letter"),
  });

  const saveMutation = useMutation({
    mutationFn: () => jobsApi.save(id),
    onSuccess: () => toast.success("Job saved"),
  });

  const trackMutation = useMutation({
    mutationFn: () =>
      jobsApi.createApplication({
        job_id: id,
        status: "saved",
        cv_id: selectedCv?.id || null,
      }),
    onSuccess: () => {
      toast.success("Added to tracker");
      navigate("/tracker");
    },
  });

  const tailorMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCv) throw new Error("Select a CV first");
      const duplicated = await cvApi.duplicate(selectedCv.id);
      const matched = await cvApi.aiMatchJob(
        selectedCv.data,
        job?.description || "",
      );
      await cvApi.update(duplicated.id, {
        title: `${selectedCv.title} - ${job?.title || "Tailored"}`,
        data: matched.data,
      });
      return duplicated.id;
    },
    onSuccess: (cvId) => {
      toast.success("Tailored CV created");
      navigate(`/cv/${cvId}`);
    },
    onError: () => toast.error("Could not tailor CV"),
  });

  const externalUrl = job?.apply_url || "#";

  return (
    <div className="min-h-screen bg-ash">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
        <button className="btn-ghost mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>

        {isLoading && <div className="card">Loading job...</div>}

        {job && (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <article className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge bg-ash-dark text-ink-muted capitalize">
                      {job.source}
                    </span>
                    {job.remote && (
                      <span className="badge bg-green-50 text-green-700">
                        Remote
                      </span>
                    )}
                  </div>
                  <h1 className="mt-3 font-display text-3xl font-bold text-ink tracking-tight">
                    {job.title}
                  </h1>
                  <p className="mt-1 text-lg text-ink-muted">
                    {job.company} · {job.location || "Location not listed"}
                  </p>
                </div>
                <a
                  className="btn-primary"
                  href={externalUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Apply externally
                </a>
              </div>
              <div className="mt-6 prose prose-slate max-w-none prose-p:text-ink prose-headings:text-ink">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-ink-muted bg-ash/50 p-4 rounded-xl border border-ash-border">
                  {job.description}
                </pre>
              </div>
            </article>

            <aside className="space-y-4">
              <div className="card">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                  AI tools
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-ink tracking-tight">
                  Match, tailor, and write
                </h2>

                {user ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="label">Use CV</label>
                      <select
                        className="input"
                        value={selectedCv?.id || ""}
                        onChange={(e) => setSelectedCvId(e.target.value)}
                      >
                        {cvs.map((cv) => (
                          <option key={cv.id} value={cv.id}>
                            {cv.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="btn-secondary w-full justify-center"
                      onClick={() => matchMutation.mutate()}
                      disabled={!selectedCv || matchMutation.isPending}
                    >
                      <Sparkles size={14} /> AI match score
                    </button>
                    <button
                      className="btn-secondary w-full justify-center"
                      onClick={() => tailorMutation.mutate()}
                      disabled={!selectedCv || tailorMutation.isPending}
                    >
                      <Copy size={14} /> Tailor my CV
                    </button>
                    <button
                      className="btn-secondary w-full justify-center"
                      onClick={() => coverMutation.mutate()}
                      disabled={!selectedCv || coverMutation.isPending}
                    >
                      <FileSignature size={14} /> Write cover letter
                    </button>
                    <button
                      className="btn-secondary w-full justify-center"
                      onClick={() => saveMutation.mutate()}
                    >
                      <Save size={14} /> Save job
                    </button>
                    <button
                      className="btn-primary w-full justify-center"
                      onClick={() => trackMutation.mutate()}
                    >
                      <Briefcase size={14} /> Track application
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-ash-border bg-ash/40 p-4 text-sm text-ink-muted">
                    Sign in to generate match scores, tailor a CV, or write a
                    cover letter.
                  </div>
                )}
              </div>

              <div className="card">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                  Source
                </p>
                <div className="mt-3 space-y-2 text-sm text-ink-muted">
                  <p>
                    <span className="text-ink">Category:</span>{" "}
                    {job.category || "General"}
                  </p>
                  <p>
                    <span className="text-ink">Posted:</span>{" "}
                    {new Date(job.posted_at).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary mt-4 w-full justify-center"
                >
                  Open listing
                </a>
              </div>
            </aside>
          </div>
        )}
      </div>

      <CoverLetterModal
        open={coverOpen}
        letter={coverLetter}
        title={job?.title || "Cover letter"}
        onClose={() => setCoverOpen(false)}
      />
    </div>
  );
}
