import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { axiomJobsApi } from "../../api";

const EMPTY = {
  title: "",
  description: "",
  location: "",
  remote: false,
  job_type: "full-time",
  salary_min: "",
  salary_max: "",
  currency: "USD",
  skills_required: "",
  experience_level: "mid",
  industry: "",
  is_active: true,
};

export default function CreateJobPage({ edit = false }: { edit?: boolean }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        skills_required: form.skills_required.split(",").map((skill) => skill.trim()).filter(Boolean),
      };
      return edit ? axiomJobsApi.update(id, body) : axiomJobsApi.create(body);
    },
    onSuccess: (job) => {
      toast.success(edit ? "Job updated" : "Job posted");
      navigate(`/jobs/axiom/${job.id}`);
    },
    onError: () => toast.error("Could not save job"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">AXIOM Jobs</p>
        <h1 className="font-display text-3xl font-bold text-ink">{edit ? "Edit job" : "Post a job"}</h1>
      </div>
      <form className="card space-y-4" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2">
          <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div><label className="label">Location</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div><label className="label">Job type</label><select className="input" value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })}>{["full-time", "part-time", "contract", "internship"].map((v) => <option key={v}>{v}</option>)}</select></div>
          <div><label className="label">Experience</label><select className="input" value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })}>{["entry", "mid", "senior", "executive"].map((v) => <option key={v}>{v}</option>)}</select></div>
          <div><label className="label">Salary min</label><input className="input" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} /></div>
          <div><label className="label">Salary max</label><input className="input" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} /></div>
          <div><label className="label">Currency</label><input className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
          <div><label className="label">Industry</label><input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={form.remote} onChange={(e) => setForm({ ...form, remote: e.target.checked })} /> Remote role</label>
        <div><label className="label">Skills</label><input className="input" value={form.skills_required} onChange={(e) => setForm({ ...form, skills_required: e.target.value })} placeholder="React, Python, Hiring" /></div>
        <div><label className="label">Description</label><textarea className="input min-h-[260px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
        <button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save job"}</button>
      </form>
    </div>
  );
}
