import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { authApi, getErrorDetail } from "../../api";
import { useAuthStore } from "../../store/auth";
import { useAnnouncement } from "../../context/announcement";
import toast from "react-hot-toast";
import { ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

function OAuthButton({ provider, label, icon }: { provider: string; label: string; icon: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { url } = await authApi.oauthLogin(provider);
      window.location.href = url;
    } catch {
      toast.error(`${provider === "google" ? "Google" : "LinkedIn"} sign in is not configured.`);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-ash-border bg-white px-4 py-2.5 text-sm font-medium text-ink transition-all hover:bg-ash disabled:opacity-50"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
      {loading ? "Redirecting..." : label}
    </button>
  );
}

const QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your primary school?",
  "What was the make of your first car?",
];

function passwordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-amber-500" };
  if (score <= 4) return { score, label: "Strong", color: "bg-lime-500" };
  return { score, label: "Very strong", color: "bg-green-500" };
}
import Seo from "../../components/Seo";

export default function RegisterPage() {
  const { bannerH } = useAnnouncement();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    secret_question: "",
    secret_answer: "",
  });
  const [showOptional, setShowOptional] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { setAuth } = useAuthStore();

  const f =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-zA-Z0-9_\-]+$/.test(form.username)) {
      toast.error("Username: letters, numbers, underscores, hyphens only");
      return;
    }
    if (!termsAccepted) {
      toast.error("Please accept the Terms of Use to create an account.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        username: form.username.trim(),
        password: form.password,
      };
      if (form.email) payload.email = form.email.trim();
      if (form.secret_question) payload.secret_question = form.secret_question;
      if (form.secret_answer) payload.secret_answer = form.secret_answer.trim();
      const res = await authApi.register(payload);
      setAuth(res.user, res.token); // ← token saved to sessionStorage
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(getErrorDetail(err) || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const { data: oauthConfig } = useQuery({
    queryKey: ["oauth-providers"],
    queryFn: authApi.oauthProviders,
    staleTime: 5 * 60 * 1000,
  });
  const configuredProviders = oauthConfig?.providers ?? [];

  return (
    <div
      className="min-h-screen bg-ash flex items-center justify-center px-4 py-8"
      style={{ paddingTop: bannerH }}
    >
      <Seo title="Create Account" noindex />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="font-display text-3xl font-bold text-ink tracking-tight"
          >
            AXIOM
          </Link>
          <p className="text-sm text-ink-muted mt-1">Create your account</p>
        </div>

        <div className="card">
          {/* OAuth buttons — only shown for configured providers */}
          {configuredProviders.length > 0 && (
            <div className="space-y-2.5 mb-5">
              {configuredProviders.includes("google") && (
                <OAuthButton
                  provider="google"
                  label="Continue with Google"
                  icon={
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  }
                />
              )}
              {configuredProviders.includes("linkedin") && (
                <OAuthButton
                  provider="linkedin"
                  label="Continue with LinkedIn"
                  icon={
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  }
                />
              )}
            </div>
          )}

          {configuredProviders.length > 0 && (
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ash-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-ink-muted">or register with email</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                value={form.username}
                onChange={f("username")}
                placeholder="unique_username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={32}
              />
              <p className="text-[11px] text-ink-muted mt-1">
                Letters, numbers, _ and - only
              </p>
            </div>

            <div>
              <label className="label">
                Password <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input pr-10"
                  value={form.password}
                  onChange={f("password")}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password.length > 0 && (() => {
                const { score, label, color } = passwordStrength(form.password);
                return (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-ash-dark overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${color}`}
                          style={{ width: `${(score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-ink-muted whitespace-nowrap">{label}</span>
                    </div>
                    <p className="text-[10px] text-ink-muted mt-1">
                      {score < 3 ? "Add uppercase, numbers, or symbols for a stronger password." : ""}
                    </p>
                  </div>
                );
              })()}
            </div>

            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${showOptional ? "rotate-180" : ""}`}
              />
              Recovery options (optional)
            </button>

            <AnimatePresence initial={false}>
              {showOptional && (
                <motion.div
                  key="optional"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="label">
                        Email (for username recovery)
                      </label>
                      <input
                        type="email"
                        className="input"
                        value={form.email}
                        onChange={f("email")}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label className="label">Secret question</label>
                      <select
                        className="input"
                        value={form.secret_question}
                        onChange={f("secret_question")}
                      >
                        <option value="">— select a question —</option>
                        {QUESTIONS.map((q) => (
                          <option key={q} value={q}>
                            {q}
                          </option>
                        ))}
                      </select>
                    </div>
                    <AnimatePresence initial={false}>
                      {form.secret_question && (
                        <motion.div
                          key="answer"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <label className="label">Answer</label>
                          <input
                            className="input"
                            value={form.secret_answer}
                            onChange={f("secret_answer")}
                            placeholder="Your answer"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Terms of Service acceptance */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ash-border accent-ink shrink-0"
              />
              <span className="text-xs text-ink-muted leading-relaxed">
                I accept the{" "}
                <Link
                  to="/terms-privacy"
                  target="_blank"
                  className="text-ink font-medium underline underline-offset-2 hover:no-underline"
                >
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link
                  to="/terms-privacy"
                  target="_blank"
                  className="text-ink font-medium underline underline-offset-2 hover:no-underline"
                >
                  Privacy Policy
                </Link>.
              </span>
            </label>

            <button
              className="btn-primary w-full justify-center"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-4 pt-4 border-t border-ash-border text-center text-xs text-ink-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-ink font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
