import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

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
}

export const BANNER_H = 32;

const Ctx = createContext<AnnouncementCtx>({
  ann: null,
  visible: false,
  bannerH: 0,
  dismiss: () => {},
});

// Persists across re-renders without any storage API
const dismissed = new Set<string>();

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [bannerH, setBannerH] = useState(0);

  const { data: ann } = useQuery<Announcement | null>({
    queryKey: ["announcement-active"],
    queryFn: () => api.get("/announcements/active").then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: 60_000,
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
    if (ann) dismissed.add(ann.id);
    setBannerH(0);
    setTimeout(() => setVisible(false), 300);
  };

  return (
    <Ctx.Provider value={{ ann: ann ?? null, visible, bannerH, dismiss }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAnnouncement = () => useContext(Ctx);
