import {  useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi, getErrorDetail } from "../../api";
import { useAuthStore } from "../../store/auth";
import { useAnnouncement } from "../../context/announcement";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { bannerH } = useAnnouncement();
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const requestedNext = params.get("next") || params.get("from") || "/dashboard";
  const next = requestedNext.startsWith("/") ? requestedNext : "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(data);
      setAuth(res.user, res.token);
      if (res.user.must_change_password) {
        toast("Please set a new password.", { icon: "🔒" });
        navigate("/account");
      } else {
        navigate(next);
      }
    } catch (err) {
      toast.error(getErrorDetail(err) || "Invalid credentials");
    }
  };

  return (
    <div
      className="min-h-screen bg-ash flex items-center justify-center px-4"
      style={{ paddingTop: bannerH }}
    >
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                {...register("username", { required: "Username is required" })}
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
            <button
              className="btn-primary w-full justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
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
