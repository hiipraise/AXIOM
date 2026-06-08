import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { recruiterApi } from "../../api";
import { useAuthStore } from "../../store/auth";

const EMPTY = { company_name: "", website: "", description: "", logo_url: "", industry: "", size: "", location: "" };

export default function RecruiterRegisterPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState(EMPTY);

  const mutation = useMutation({
    mutationFn: () => recruiterApi.register(form),
    onSuccess: async () => {
      toast.success("Recruiter profile ready");
      if (user) setUser({ ...user, role: "recruiter" });
      navigate("/recruiter");
    },
    onError: () => toast.error("Could not create recruiter profile"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Recruiter</p>
        <h1 className="font-display text-3xl font-bold text-ink">Create company profile</h1>
      </div>
      <form onSubmit={submit} className="card space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-ash-border bg-ash/50 p-3 text-sm text-ink-muted">
          <Building2 size={16} /> Post up to 5 active jobs during the MVP.
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["company_name", "Company name"],
            ["website", "Website"],
            ["logo_url", "Logo URL"],
            ["industry", "Industry"],
            ["size", "Company size"],
            ["location", "Location"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input className="input" value={(form as any)[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={key === "company_name"} />
            </div>
          ))}
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[140px]" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        <button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Become a recruiter"}</button>
      </form>
    </div>
  );
}
