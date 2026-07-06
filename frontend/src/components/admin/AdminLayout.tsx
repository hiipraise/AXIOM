import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  ChevronLeft,
  Menu,
  X,
  BarChart2,
  MessageSquare,
  Megaphone,
  ScrollText,
  Mail,
  Smartphone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnnouncement } from "../../context/announcement";
import Breadcrumb from "../Breadcrumb";
import clsx from "clsx";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/email", label: "Email", icon: Mail },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { to: "/admin/push", label: "Push", icon: Smartphone },
  { to: "/admin/cvs", label: "All CVs", icon: FileText },
];

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="px-4 py-4 border-b border-ash-border">
        <span className="font-display text-sm font-bold text-ink">
          AXIOM Admin
        </span>
        <button
          onClick={() => {
            navigate("/dashboard");
            onNav?.();
          }}
          className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink mt-1 transition-colors"
        >
          <ChevronLeft size={11} /> Back to app
        </button>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNav}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all",
                isActive
                  ? "bg-ink text-white font-medium"
                  : "text-ink-muted hover:bg-ash hover:text-ink",
              )
            }
          >
            <Icon size={13} /> {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { bannerH } = useAnnouncement();
  const BREADCRUMB_H = 44;
  const BREADCRUMB_MOBILE_H = 36;
  const topOffset = bannerH + BREADCRUMB_H;
  const topOffsetMobile = bannerH + BREADCRUMB_MOBILE_H;

  return (
    <>
      <Breadcrumb />

      {/* Desktop sidebar — hidden on mobile */}
      <aside
        className="hidden md:flex w-52 bg-white border-r border-ash-border flex-col fixed z-20"
        style={{
          top: topOffset,
          bottom: 0,
          transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed top-0 left-0 h-full w-64 bg-white z-50 flex flex-col shadow-xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              style={{
                top: topOffsetMobile,
                transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 p-1.5 text-ink-muted hover:text-ink"
              >
                <X size={16} />
              </button>
              <SidebarContent onNav={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile top bar — hidden on desktop */}
      <div
        className="fixed left-0 right-0 z-30 bg-white border-b border-ash-border px-4 h-12 flex items-center justify-between md:hidden"
        style={{
          top: topOffsetMobile,
          transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <span className="font-display text-sm font-bold text-ink">
          AXIOM Admin
        </span>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-ink-muted hover:text-ink"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Single main content area */}
      <main className="min-h-screen bg-ash md:ml-52">
        {/* Top spacer accounts for fixed elements: breadcrumb + mobile bar + padding */}
        <div
          className="md:hidden"
          style={{
            height: `calc(${topOffsetMobile}px + 56px)`,
            transition: "height 0.28s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        <div
          className="hidden md:block"
          style={{
            height: `calc(${topOffset}px + 16px)`,
            transition: "height 0.28s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        <Outlet />
      </main>
    </>
  );
}
