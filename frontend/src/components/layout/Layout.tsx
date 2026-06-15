import { useState } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import {
  Plus,
  LogOut,
  Settings,
  LayoutDashboard,
  Shield,
  Menu,
  X,
  Briefcase,
  Brain,
  Building2,
  ClipboardList,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../store/auth";
import { authApi } from "../../api";
import { useAnnouncement } from "../../context/announcement";
import NotificationBell from "../notifications/NotificationBell";
import ConfirmDialog from "../UI/ConfirmDialog";
import Breadcrumb from "../Breadcrumb";
import CommandPalette from "../UI/CommandPalette";
import clsx from "clsx";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/interview", label: "Interview Prep", icon: Brain },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/tracker", label: "Tracker", icon: ClipboardList },
  { to: "/account", label: "Account", icon: Settings },
];

function SidebarContent({
  onNav,
  collapsed,
  onToggleCollapse,
  onSearch,
}: {
  onNav?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onSearch?: () => void;
}) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const isAdmin = user && ["admin", "superadmin", "staff"].includes(user.role);
  const canRecruit =
    user && ["recruiter", "admin", "superadmin", "staff"].includes(user.role);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (_e) {
      /* best-effort logout */
    }
    clearAuth();
    navigate("/");
  };

  return (
    <>
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-ash-border">
        <Link
          to="/"
          onClick={onNav}
          className="flex items-center gap-2 min-w-0"
        >
          <img
            src="/axiom(dark).png"
            alt="AXIOM"
            className={clsx(
              "h-7 w-auto object-contain flex-shrink-0 transition-all",
              collapsed && "h-6",
            )}
          />
          {!collapsed && (
            <span className="font-display text-xl font-bold text-ink tracking-tight leading-none">
              AXIOM
            </span>
          )}
        </Link>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="ml-2 flex-shrink-0 p-1.5 text-ink-muted hover:text-ink transition-colors rounded-md hover:bg-ash"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} />
            ) : (
              <PanelLeftClose size={15} />
            )}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNav}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-ink text-white"
                  : "text-ink-muted hover:bg-ash hover:text-ink",
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={15} className="flex-shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
        <button
          onClick={() => {
            navigate("/cv/new");
            onNav?.();
          }}
          className={clsx(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-muted hover:bg-ash hover:text-ink transition-all",
            collapsed ? "justify-center px-2" : "",
          )}
          title={collapsed ? "New CV" : undefined}
        >
          <Plus size={15} className="flex-shrink-0" />
          {!collapsed && "New CV"}
        </button>
        <button
          onClick={() => onSearch?.()}
          className={clsx(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-muted hover:bg-ash hover:text-ink transition-all",
            collapsed ? "justify-center px-2" : "",
          )}
          title={collapsed ? "Search" : undefined}
        >
          <Search size={15} className="flex-shrink-0" />
          {!collapsed && "Search"}
        </button>
        <NavLink
          to={canRecruit ? "/recruiter" : "/recruiter/register"}
          onClick={onNav}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
              collapsed ? "justify-center px-2" : "",
              isActive
                ? "bg-ink text-white"
                : "text-ink-muted hover:bg-ash hover:text-ink",
            )
          }
          title={collapsed ? "Recruiter" : undefined}
        >
          <Building2 size={15} className="flex-shrink-0" />
          {!collapsed && "Recruiter"}
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={onNav}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-ink text-white"
                  : "text-ink-muted hover:bg-ash hover:text-ink",
              )
            }
            title={collapsed ? "Admin" : undefined}
          >
            <Shield size={15} className="flex-shrink-0" />
            {!collapsed && "Admin"}
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-ash-border">
        {collapsed ? (
          // Collapsed: stack avatar, bell (desktop only), logout vertically
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:flex">
              <NotificationBell />
            </div>
            <button
              onClick={() => setConfirmSignOut(true)}
              className="p-1.5 text-ink-muted hover:text-red-600 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2.5 mb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink truncate">
                    {user?.username}
                  </p>
                  <p className="text-[10px] text-ink-muted capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
              <div className="hidden lg:flex">
                <NotificationBell />
              </div>
            </div>
            <button
              onClick={() => setConfirmSignOut(true)}
              className="w-full flex items-center gap-2 text-xs text-ink-muted hover:text-red-600 transition-colors py-1"
            >
              <LogOut size={12} /> Sign out
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        description="You will need to sign in again to access your workspace."
        confirmLabel="Sign out"
        variant="danger"
        onClose={() => setConfirmSignOut(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}

const SIDEBAR_W = 224; // w-56
const COLLAPSED_W = 56; // w-14
const BREADCRUMB_H = 44; // breadcrumb height on desktop
const BREADCRUMB_MOBILE_H = 36; // breadcrumb height on mobile

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { bannerH } = useAnnouncement();

  const sidebarW = collapsed ? COLLAPSED_W : SIDEBAR_W;
  const topOffset = bannerH + BREADCRUMB_H;
  const topOffsetMobile = bannerH + BREADCRUMB_MOBILE_H;

  return (
    <div className="min-h-screen bg-ash flex">
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed z-20 bg-white border-r border-ash-border overflow-visible"
        style={{
          top: topOffset,
          bottom: 0,
          width: sidebarW,
          transition:
            "width 0.22s cubic-bezier(0.4,0,0.2,1), top 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          onSearch={() => setSearchOpen(true)}
        />
      </aside>

      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed left-0 right-0 z-30 bg-white border-b border-ash-border px-4 h-14 flex items-center justify-between"
        style={{
          top: topOffsetMobile,
          transition: "top 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/axiom(dark).png"
            alt="AXIOM"
            className="h-6 w-auto object-contain"
          />
          <span className="font-display text-lg font-bold text-ink tracking-tight">
            AXIOM
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-ink-muted hover:text-ink transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="lg:hidden fixed left-0 w-72 bg-white z-50 flex flex-col shadow-xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              style={{ top: topOffsetMobile, bottom: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-ink-muted hover:text-ink"
              >
                <X size={18} />
              </button>
              <SidebarContent
                onNav={() => setMobileOpen(false)}
                onSearch={() => {
                  setMobileOpen(false);
                  setSearchOpen(true);
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main
        className="flex-1 min-h-screen"
      >
        {/* Desktop: offset for sidebar width */}
        <div
          className="hidden lg:block"
          style={{
            marginLeft: sidebarW,
            paddingTop: topOffset + 16,
            transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <Breadcrumb />
          <Outlet />
        </div>
        {/* Mobile: account for banner + top bar + breadcrumb */}
        <div
          className="lg:hidden"
          style={{
            paddingTop: bannerH + 88,
          }}
        >
          <Breadcrumb />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
