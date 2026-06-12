import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { api, trackEvent } from "../api";

interface Announcement {
  id: string;
  text: string;
  type: "info" | "warning" | "success";
  active: boolean;
}

interface AnnouncementCtx {
  ann: Announcement | null;
  visible: boolean; // controls whether the DOM node exists
  bannerH: number; // 0 or 32 — transitions between them, use for all offsets
  dismiss: () => void;
  ready: boolean; // whether backend is ready — controls fetching
}

export const BANNER_H = 32;

const Ctx = createContext<AnnouncementCtx>({
  ann: null,
  visible: false,
  bannerH: 0,
  dismiss: () => {},
  ready: true, // default to true for backwards compatibility
});

// Persists across re-renders without any storage API
const dismissed = new Set<string>();

// Exported function to signal backend is ready — call after health check passes
let setReadyFn: ((ready: boolean) => void) | null = null;
export function announceReady(isReady: boolean) {
  if (setReadyFn) setReadyFn(isReady);
}

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [bannerH, setBannerH] = useState(0);
  const [ready, setReady] = useState(false); // start false, enabled when backend is ready

  // Register the setReady function for external callers
  useEffect(() => {
    setReadyFn = setReady;
    return () => {
      setReadyFn = null;
    };
  }, []);

  const { data: ann } = useQuery<Announcement | null>({
    queryKey: ["announcement-active"],
    queryFn: () => api.get("/announcements/active").then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: ready, // only fetch when backend is confirmed ready
  });

  useEffect(() => {
    if (ann?.active && !dismissed.has(ann.id)) {
      setVisible(true);
      // rAF ensures element is in DOM before we set height (triggers CSS transition)
      requestAnimationFrame(() => setBannerH(BANNER_H));
    } else {
      setBannerH(0);
      // wait for transition to finish before removing from DOM
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [ann?.id, ann?.active]);

  const dismiss = () => {
    if (ann) {
      dismissed.add(ann.id);
      trackEvent("announcement_dismiss", { announcement_id: ann.id });
    }
    setBannerH(0);
    setTimeout(() => setVisible(false), 300);
  };

  return (
    <Ctx.Provider value={{ ann: ann ?? null, visible, bannerH, dismiss, ready }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAnnouncement = () => useContext(Ctx);
