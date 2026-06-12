import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, CalendarClock, FileText, Plus, Star, Trash2, Users } from "lucide-react";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import toast from "react-hot-toast";
import { axiomApplicationsApi, axiomJobsApi, recruiterApi } from "../../api";

function RecruiterDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-pulse">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="h-3 w-36 rounded bg-ash-dark mb-3" />
          <div className="h-8 w-64 rounded bg-ash-dark" />
        </div>
        <div className="h-10 w-24 rounded-xl bg-ash-dark" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card">
            <div className="h-5 w-5 rounded bg-ash-dark" />
            <div className="mt-3 h-8 w-12 rounded bg-ash-dark" />
            <div className="mt-2 h-4 w-24 rounded bg-ash-dark" />
          </div>
        ))}
      </div>
      <section className="mt-6 card">
        <div className="mb-4 h-6 w-32 rounded bg-ash-dark" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 w-48 rounded bg-ash-dark" />
                <div className="h-3 w-32 rounded bg-ash-dark" />
              </div>
              <div className="h-8 w-16 rounded-lg bg-ash-dark" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["recruiter-profile"],
    queryFn: recruiterApi.profile,
    retry: false,
  });

  const jobs = useQuery({
    queryKey: ["axiom-jobs-mine"],
    queryFn: axiomJobsApi.mine,
    enabled: !profile.isError,
  });

  const applications = useQuery({
    queryKey: ["employer-applications"],
    queryFn: axiomApplicationsApi.employer,
    enabled: !profile.isError,
  });

  const savedCandidates = useQuery({
    queryKey: ["saved-candidates"],
    queryFn: () => recruiterApi.savedCandidates(),
    enabled: !profile.isError,
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => axiomJobsApi.close(id),
    onSuccess: () => {
      toast.success("Job closed");
      qc.invalidateQueries({ queryKey: ["axiom-jobs-mine"] });
    },
    onError: () => toast.error("Could not close job"),
  });
  const [jobToClose, setJobToClose] = useState<string | null>(null);

  if (profile.isLoading) return <RecruiterDashboardSkeleton />;
  if (profile.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="card text-center">
          <h1 className="font-display text-2xl font-bold text-ink">
            Recruiter profile needed
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Create a company profile before posting AXIOM jobs.
          </p>
          <button
            className="btn-primary mt-4"
            onClick={() => navigate("/recruiter/register")}
          >
            Create profile
          </button>
        </div>
      </div>
    );
  }

  const activeJobs = (jobs.data || []).filter((job) => job.is_active);
  const inactiveJobs = (jobs.data || []).filter((job) => !job.is_active);
  const shortlisted = (applications.data || []).filter((app) => app.status === "shortlisted");
  const upcomingInterviews = (applications.data || []).filter((app) => app.status === "interview_scheduled");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
            Recruiter dashboard
          </p>
          <h1 className="font-display text-3xl font-bold text-ink">
            {profile.data?.company_name}
          </h1>
        </div>
        <Link className="btn-primary" to="/jobs/axiom/new">
          <Plus size={15} /> Post job
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card">
          <Briefcase size={18} />
          <p className="mt-3 text-2xl font-bold text-ink">
            {activeJobs.length || 0}
          </p>
          <p className="text-sm text-ink-muted">Active jobs</p>
        </div>
        <div className="card">
          <FileText size={18} />
          <p className="mt-3 text-2xl font-bold text-ink">
            {applications.data?.length || 0}
          </p>
          <p className="text-sm text-ink-muted">Applications</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
            Free tier
          </p>
          <p className="mt-3 text-2xl font-bold text-ink">
            {Math.max(0, 5 - activeJobs.length)}
          </p>
          <p className="text-sm text-ink-muted">Active slots left</p>
        </div>
        <Link className="card hover:bg-ash/40" to="/recruiter/talent-pools">
          <Users size={18} />
          <p className="mt-3 text-2xl font-bold text-ink">
            {savedCandidates.data?.length || 0}
          </p>
          <p className="text-sm text-ink-muted">Saved profiles</p>
        </Link>
      </div>

      <section className="mt-6 card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">
            Active jobs
          </h2>
          <div className="flex items-center gap-3">
            <Link
              className="text-sm text-ink-muted underline"
              to="/recruiter/talent-pools"
            >
              Talent pools
            </Link>
            <Link
              className="text-sm text-ink-muted underline"
              to="/recruiter/applications"
            >
              Applications
            </Link>
          </div>
        </div>
        <div className="divide-y divide-ash-border">
          {activeJobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="font-medium text-ink">{job.title}</p>
                <p className="text-xs text-ink-muted">
                  {job.location || "Flexible"} · {job.views} views
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="btn-secondary !py-1.5 !px-3 !text-xs"
                  to={`/jobs/axiom/${job.id}/edit`}
                >
                  Edit
                </Link>
                <button
                  className="btn-ghost !py-1.5 !px-3 !text-xs text-red-600 hover:text-red-700"
                  onClick={() => setJobToClose(job.id)}
                  disabled={closeMutation.isPending}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {activeJobs.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-muted">
              No active jobs
            </p>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-ink"><CalendarClock size={18} /> Upcoming interviews</h2>
          <div className="divide-y divide-ash-border">
            {upcomingInterviews.slice(0, 5).map((app) => (
              <Link key={app.id} to="/recruiter/applications" className="block py-3 hover:bg-ash/40">
                <p className="font-medium text-ink">{app.job?.title || "AXIOM role"}</p>
                <p className="text-xs text-ink-muted">Candidate {app.candidate_id}</p>
              </Link>
            ))}
            {upcomingInterviews.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">No scheduled interviews yet</p>}
          </div>
        </section>
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-ink"><Star size={18} /> Shortlisted candidates</h2>
          <div className="divide-y divide-ash-border">
            {shortlisted.slice(0, 5).map((app) => (
              <Link key={app.id} to="/recruiter/applications" className="block py-3 hover:bg-ash/40">
                <p className="font-medium text-ink">{app.job?.title || "AXIOM role"}</p>
                <p className="text-xs text-ink-muted">Ready for interview scheduling</p>
              </Link>
            ))}
            {shortlisted.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">No shortlisted candidates yet</p>}
          </div>
        </section>
      </div>

      {inactiveJobs.length > 0 && (
        <section className="mt-6 card bg-ash/40">
          <h2 className="font-display text-xl font-bold text-ink-muted mb-3">
            Closed jobs
          </h2>
          <div className="divide-y divide-ash-border">
            {inactiveJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium text-ink-muted">{job.title}</p>
                  <p className="text-xs text-ink-muted">
                    {job.location || "Flexible"} · {job.views} views
                  </p>
                </div>
                <span className="badge bg-white text-ink-muted border border-ash-border">
                  Closed
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={!!jobToClose}
        title="Close job listing?"
        description="This will hide the job from candidates immediately."
        confirmLabel="Close job"
        variant="danger"
        onClose={() => setJobToClose(null)}
        onConfirm={() => {
          closeMutation.mutate(jobToClose!);
          setJobToClose(null);
        }}
      />
    </div>
  );
}
