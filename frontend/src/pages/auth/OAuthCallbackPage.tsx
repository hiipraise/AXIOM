import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { authApi } from "../../api";
import toast from "react-hot-toast";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const error = searchParams.get("error");
    if (error) {
      const messages: Record<string, string> = {
        session_expired: "Session expired. Please try again.",
        token_failed: "Failed to sign in with provider. Please try again.",
        userinfo_failed: "Could not retrieve your profile information.",
        no_email: "Your account does not have a public email address.",
      };
      toast.error(messages[error] || "Authentication failed. Please try again.");
      navigate("/login", { replace: true });
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      toast.error("No authentication token received.");
      navigate("/login", { replace: true });
      return;
    }

    // Store token in auth state so the axios interceptor picks it up for /me
    useAuthStore.setState({ token });

    // Fetch user profile and complete sign-in
    authApi
      .me()
      .then((user: any) => {
        setAuth(user, token);
        toast.success("Signed in successfully!");
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        toast.error("Failed to verify your session.");
        navigate("/login", { replace: true });
      });
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="min-h-screen bg-ash flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-ink-muted">Completing sign in...</p>
      </div>
    </div>
  );
}
