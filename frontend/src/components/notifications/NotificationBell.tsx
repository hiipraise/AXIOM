import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { Link } from "react-router-dom";
import { notificationsApi } from "../../api";
import { useEffect, useRef, useState } from "react";

export default function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Close on outside click/touch
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="relative p-2 text-ink-muted hover:text-ink transition-colors"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close notifications" : "Open notifications"}
      >
        {open ? <BellRing size={17} /> : <Bell size={17} />}
        {!open && unread > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div
          className="
            absolute right-0 z-50
            w-72 max-w-[calc(100vw-1rem)]
            rounded-lg border border-ash-border bg-white p-3 shadow-xl
            mt-2
            md:mt-0 md:mb-2 md:bottom-full
          "
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <button
              className="text-xs text-ink-muted underline"
              onClick={() => readAll.mutate()}
            >
              Mark read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {data.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                to={item.link || "#"}
                onClick={() => setOpen(false)}
                className="block rounded-lg p-2 hover:bg-ash"
              >
                <p className="text-sm font-medium text-ink">{item.title}</p>
                {item.body && (
                  <p className="text-xs text-ink-muted line-clamp-2">
                    {item.body}
                  </p>
                )}
              </Link>
            ))}
            {!data.length && (
              <p className="p-3 text-center text-xs text-ink-muted">
                No notifications
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}