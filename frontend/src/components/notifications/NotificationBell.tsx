import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { Link } from "react-router-dom";
import { notificationsApi } from "../../api";
import { useEffect, useRef, useState } from "react";

export default function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    refetchInterval: 30000,
  });

  const unread = data.filter((item) => !item.read).length;

  const readAll = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const openBell = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const vw = window.innerWidth;
    const dropW = Math.min(288, vw - 16);

    // If there's room to the right of the button (e.g. sidebar bell on desktop),
    // open rightward. Otherwise right-align the dropdown to the button and clamp.
    let left: number;
    if (vw - rect.right >= dropW + 8) {
      left = rect.right + 4; // open to the right → clears the sidebar
    } else {
      left = rect.right - dropW; // right-align to button edge
      left = Math.max(8, left); // don't overflow left
      left = Math.min(vw - dropW - 8, left); // don't overflow right
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH = 360;
    const top = spaceBelow < dropH ? rect.top - dropH - 6 : rect.bottom + 6;

    setDropPos({ top, left, width: dropW });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onMouse = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onMouse);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const dropdown =
    open && dropPos
      ? createPortal(
          <div
            style={{
              position: "fixed",
              top: dropPos.top,
              left: dropPos.left,
              zIndex: 9999,
              width: dropPos.width, // ← was hardcoded 288
            }}
            className="rounded-xl border border-ash-border bg-white shadow-xl p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Notifications</p>
              <button
                className="text-xs text-ink-muted underline"
                onClick={() => readAll.mutate()}
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-0.5">
              {data.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  to={item.link || "#"}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg p-2.5 transition-colors ${
                    item.read ? "hover:bg-ash" : "bg-ash hover:bg-ash-dark"
                  }`}
                >
                  <p
                    className={`text-sm ${item.read ? "text-ink-muted" : "text-ink font-medium"}`}
                  >
                    {item.title}
                  </p>
                  {item.body && (
                    <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">
                      {item.body}
                    </p>
                  )}
                </Link>
              ))}
              {!data.length && (
                <p className="p-4 text-center text-xs text-ink-muted">
                  No notifications yet
                </p>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        className="relative p-2 text-ink-muted hover:text-ink transition-colors"
        onClick={openBell}
        aria-label={open ? "Close notifications" : "Open notifications"}
      >
        {open ? <BellRing size={17} /> : <Bell size={17} />}
        {!open && unread > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>
      {dropdown}
    </>
  );
}
