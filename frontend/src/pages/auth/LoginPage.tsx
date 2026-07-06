import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi, getErrorDetail } from "../../api";
import { useAuthStore } from "../../store/auth";
import { useAnnouncement } from "../../context/announcement";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface LoginForm {
  username: string;
  password: string;
}
import Seo from "../../components/Seo";

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

function loginError(err: unknown): string {
  const detail = getErrorDetail(err);
  if ((err as any)?.response?.status === 429) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  if (detail) return detail;
  return "Invalid username or password.";
}

export default function LoginPage() {
  const { bannerH } = useAnnouncement();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(useAuthStore.getState().rememberMe);
  const { setAuth, setRememberMe: storeSetRememberMe, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedNext = searchParams.get("next") || searchParams.get("from") || "/dashboard";
  const next = requestedNext.startsWith("/") ? requestedNext : "/dashboard";

  // Already logged in — redirect away
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      data.username = data.username.trim();
      const res = await authApi.login(data);
      setAuth(res.user, res.token);
      if (res.user.must_change_password) {
        toast("Please set a new password.", { icon: "🔒" });
        navigate("/account");
      } else {
        navigate(next);
      }
    } catch (err) {
      toast.error(loginError(err));
    }
  };

  const handleRememberToggle = () => {
    const next = !rememberMe;
    setRememberMe(next);
    storeSetRememberMe(next);
  };

  return (
    <div
      className="min-h-screen bg-ash flex items-center justify-center px-4"
      style={{ paddingTop: bannerH }}
    >
      <Seo title="Sign In" noindex />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="font-display text-3xl font-bold text-ink tracking-tight"
          >
            AXIOM
          </Link>
          <p className="text-sm text-ink-muted mt-1">Career Workspace</p>
        </div>

        <div className="card">
          <h2 className="font-semibold text-ink mb-5">Sign in</h2>
          {/* OAuth buttons */}
          <div className="space-y-2.5 mb-5">
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
            <OAuthButton
              provider="linkedin"
              label="Continue with LinkedIn"
              icon={
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              }
            />
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ash-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-ink-muted">or sign in with password</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Username or email</label>
              <input
                className="input"
                {...register("username", { required: "Username or email is required" })}
                placeholder="your_username"
                autoComplete="username"
              />
              {errors.username && (
                <p className="text-xs text-red mt-1">{errors.username.message}</p>
              )}
            </div>
            <div>
              <label className="label">Password</label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input pr-10"
                  {...register("password", { required: "Password is required" })}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
              {errors.password && (
                <p className="text-xs text-red mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={handleRememberToggle}
                className="h-4 w-4 rounded border-ash-border accent-ink"
              />
              <span className="text-xs text-ink-muted">
                Remember me{" "}
                <span className="text-[10px] text-ink-muted/60">
                  (stay signed in across browser sessions)
                </span>
              </span>
            </label>

            <button
              className="btn-primary w-full justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Checking credentials...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-ash-border space-y-2 text-center">
            <Link
              to="/forgot"
              className="text-xs text-ink-muted hover:text-ink"
            >
              Forgot username or password?
            </Link>
            <p className="text-xs text-ink-muted">
              No account?{" "}
              <Link
                to="/register"
                className="text-ink font-medium hover:underline"
              >
                Register
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-ink-muted mt-4">
          Continue without account?{" "}
          <Link to="/guest" className="text-ink hover:underline">
            Session-only mode
          </Link>
        </p>
      </div>
    </div>
  );
}
