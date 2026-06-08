import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { recruiterApi } from "../../api";

const EMPTY = { company_name: "", website: "", description: "", logo_url: "", industry: "", size: "", location: "" };

function CompanyProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-pulse">
      <div className="mb-6">
        <div className="h-3 w-24 rounded bg-ash-dark mb-3" />
        <div className="h-8 w-56 rounded bg-ash-dark" />
      </div>
      <div className="card space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-24 rounded bg-ash-dark mb-2" />
              <div className="h-10 rounded-lg bg-ash-dark" />
            </div>
          ))}
        </div>
        <div>
          <div className="h-3 w-24 rounded bg-ash-dark mb-2" />
          <div className="h-44 rounded-lg bg-ash-dark" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-ash-dark" />
      </div>
    </div>
  );
}

export default function CompanyProfilePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const profile = useQuery({ queryKey: ["company-profile-self"], queryFn: recruiterApi.profile });

  useEffect(() => {
    if (!profile.data) return;
    setForm({
      company_name: profile.data.company_name || "",
      website: profile.data.website || "",
      description: profile.data.description || "",
      logo_url: profile.data.logo_url || "",
      industry: profile.data.industry || "",
      size: profile.data.size || "",
      location: profile.data.location || "",
    });
  }, [profile.data]);

  const mutation = useMutation({
    mutationFn: () => recruiterApi.updateProfile(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-profile-self"] });
      toast.success("Company profile updated");
    },
    onError: () => toast.error("Could not update company profile"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  if (profile.isLoading) return <CompanyProfileSkeleton />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Recruiter</p>
        <h1 className="font-display text-3xl font-bold text-ink">Company profile</h1>
        {profile.data?.company_slug && <p className="mt-1 text-sm text-ink-muted">Public page: /company/{profile.data.company_slug}</p>}
      </div>
      <form className="card space-y-4" onSubmit={submit}>
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
          <textarea className="input min-h-[180px]" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        <button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save profile"}</button>
      </form>
    </div>
  );
}
