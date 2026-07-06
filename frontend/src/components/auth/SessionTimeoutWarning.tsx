import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, getTokenExpiry } from "../../store/auth";
import { authApi } from "../../api";
import { Clock, AlertTriangle } from "lucide-react";

/**
 * SessionTimeoutWarning — watches the stored token expiry and shows a
 * warning modal when < 5 minutes remain. Auto-logs out when expired.
 */
export default function SessionTimeoutWarning() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [minsLeft, setMinsLeft] = useState(0);
  const warned = useRef(false);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      warned.current = false;
      return;
    }

    const tick = () => {
      const expiry = getTokenExpiry();
      if (!expiry) return;

      const ms = expiry - Date.now();

      // Already expired — log out
      if (ms <= 0) {
        clearAuth();
        navigate("/login", { replace: true });
        return;
      }

      const mins = Math.floor(ms / 60_000);

      // Warn when < 5 minutes remain (once per session)
      if (mins < 5 && !warned.current) {
        warned.current = true;
        setMinsLeft(mins);
        setShowWarning(true);
      }
    };

    tick();
    const interval = setInterval(tick, 15_000); // check every 15s
    return () => clearInterval(interval);
  }, [user, clearAuth, navigate]);

  if (!showWarning || !user) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-3xl border border-ash-border bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-amber-100 p-2.5">
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-ink">Session expiring soon</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              You will be signed out in <b>{minsLeft} minute{minsLeft !== 1 ? "s" : ""}</b>.
            </p>
          </div>
        </div>

        <p className="text-sm text-ink-muted mb-5 leading-relaxed">
          For security, your session will expire soon. Any unsaved changes may be lost.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowWarning(false);
              warned.current = false;
              // Re-authenticate to confirm session is still valid
              authApi.me().catch(() => {
                clearAuth();
                navigate("/login", { replace: true });
              });
            }}
            className="btn-primary flex-1 justify-center text-sm"
          >
            I'm still here
          </button>
          <button
            onClick={() => {
              clearAuth();
              navigate("/login", { replace: true });
            }}
            className="btn-secondary flex-1 justify-center text-sm"
          >
            Sign out
          </button>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-ink-muted">
          <AlertTriangle size={10} />
          Unsaved work will be lost when the session expires.
        </p>
      </div>
    </div>
  );
}
