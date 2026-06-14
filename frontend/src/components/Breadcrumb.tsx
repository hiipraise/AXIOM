import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import clsx from "clsx";
import { useAnnouncement } from "../context/announcement";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbConfig {
  [path: string]: string | ((params: Record<string, string>) => string);
}

const BREADCRUMB_TRAIL: BreadcrumbConfig = {
  "/dashboard": "Dashboard",
  "/cv/new": "New CV",
  "/notifications": "Notifications",
  "/tracker": "Application Tracker",
  "/recruiter": "Recruiter",
  "/recruiter/register": "Recruiter Registration",
  "/recruiter/profile": "Company Profile",
  "/recruiter/applications": "Applications",
  "/recruiter/talent-pools": "Talent Pools",
  "/jobs/axiom/new": "Post Job",
  "/jobs": "Jobs",
  "/interview": "Interview Prep",
  "/account": "Account",
  "/admin": "Admin",
  "/admin/analytics": "Analytics",
  "/admin/users": "Users",
  "/admin/audit": "Audit Log",
  "/admin/cvs": "CVs",
  "/admin/ratings": "Ratings",
  "/admin/feedback": "Feedback",
  "/admin/announcements": "Announcements",
  // Dynamic routes - handled via params
  "/cv/:id": (params) => params.id || "CV",
  "/jobs/:id": "Job Details",
  "/jobs/axiom/:id": "Job Details",
  "/jobs/axiom/:id/edit": "Edit Job",
  "/interview/:sessionId": "Interview",
  "/interview/:sessionId/review": "Review",
  "/interview/live/:sessionId/lobby": "Lobby",
  "/interview/live/:sessionId": "Live Interview",
};

function matchBreadcrumb(pathname: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Home", href: "/" }];
  const segments = pathname.split("/").filter(Boolean);

  let currentPath = "";

  for (const segment of segments) {
    currentPath += "/" + segment;

    // Check for exact match first
    let label = BREADCRUMB_TRAIL[currentPath];

    // Check for pattern match
    if (!label) {
      for (const [pattern, value] of Object.entries(BREADCRUMB_TRAIL)) {
        if (pattern.includes(":")) {
          const regex = new RegExp("^" + pattern.replace(/:[^/]+/g, "[^/]+") + "$");
          if (regex.test(currentPath)) {
            label = value;
            break;
          }
        }
      }
    }

    if (label) {
      items.push({
        label: typeof label === "function" ? label({ [segment]: segment }) : label,
        href: currentPath,
      });
    }
  }

  return items;
}

export default function Breadcrumb() {
  const location = useLocation();
  const items = matchBreadcrumb(location.pathname);
  const { bannerH } = useAnnouncement();

  // Don't show on root or landing pages
  if (items.length <= 1) return null;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 flex items-center gap-1 px-4 md:px-6 text-xs md:text-sm text-ink-muted bg-white border-b border-ash-border"
      style={{ paddingTop: bannerH + 12, paddingBottom: 12 }}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight size={14} className="mx-1.5 text-ink-border" />
          )}
          {index === 0 ? (
            <Link
              to={item.href || "/"}
              className="flex items-center gap-1 hover:text-ink transition-colors"
            >
              <Home size={14} />
              <span className="hidden sm:inline">Home</span>
            </Link>
          ) : index === items.length - 1 ? (
            <span className="text-ink font-medium">{item.label}</span>
          ) : item.href ? (
            <Link
              to={item.href}
              className={clsx(
                "hover:text-ink transition-colors capitalize",
                // Truncate long labels
                item.label.length > 20 && "max-w-[120px] truncate"
              )}
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}