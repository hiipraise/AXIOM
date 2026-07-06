import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import Layout from "./components/layout/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import AppLoading from "./components/AppLoading";
import AdminLayout from "./components/admin/AdminLayout";

// Lazy load all page components
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ForgotPage = lazy(() => import("./pages/auth/ForgotPage"));
const OAuthCallbackPage = lazy(() => import("./pages/auth/OAuthCallbackPage"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const CVEditorPage = lazy(() => import("./pages/cv/CVEditorPage"));
const CVNewPage = lazy(() => import("./pages/cv/CVNewPage"));
const CVPrintPage = lazy(() => import("./pages/cv/CVPrintPage"));
const GuestCVEditorPage = lazy(() => import("./pages/cv/GuestCVEditorPage"));
const PublicCVPage = lazy(() => import("./pages/public/PublicCVPage"));
const PublicProfilePage = lazy(
  () => import("./pages/public/PublicProfilePage"),
);
const PublicCVBrowsePage = lazy(
  () => import("./pages/public/PublicCVBrowsePage"),
);

const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const WhyAxiomPage = lazy(() => import("./pages/public/WhyAxiomPage"));
const LegalPage = lazy(() => import("./pages/public/LegalPage"));
const FAQPage = lazy(() => import("./pages/public/FAQPage"));
const SkillGapPage = lazy(() => import("./pages/SkillGapPage"));
const AccountPage = lazy(() => import("./pages/dashboard/AccountPage"));
const JobBoardPage = lazy(() => import("./pages/jobs/JobBoardPage"));
const JobDetailPage = lazy(() => import("./pages/jobs/JobDetailPage"));
const PublicJobsPage = lazy(() => import("./pages/jobs/PublicJobsPage"));
const SavedJobsPage = lazy(() => import("./pages/jobs/SavedJobsPage"));
const InterviewStartPage = lazy(
  () => import("./pages/interview/InterviewStartPage"),
);
const InterviewSessionPage = lazy(
  () => import("./pages/interview/InterviewSessionPage"),
);
const InterviewReviewPage = lazy(
  () => import("./pages/interview/InterviewReviewPage"),
);
const InterviewReviewCardsPage = lazy(
  () => import("./pages/interview/InterviewReviewCardsPage"),
);
const InterviewHistoryPage = lazy(
  () => import("./pages/interview/InterviewHistoryPage"),
);
const SharedInterviewPage = lazy(
  () => import("./pages/interview/SharedInterviewPage"),
);

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCVs = lazy(() => import("./pages/admin/AdminCVs"));
const AdminFeedback = lazy(() => import("./pages/admin/AdminFeedback"));
const AdminAnnouncements = lazy(
  () => import("./pages/admin/AdminAnnouncements"),
);
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminPushSubscriptions = lazy(
  () => import("./pages/admin/AdminPushSubscriptions"),
);
const EmailComposePage = lazy(() => import("./pages/admin/EmailComposePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const NotificationsPage = lazy(
  () => import("./pages/dashboard/NotificationsPage"),
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();
  if (isLoading) return <AppLoading fullScreen />;
  if (!user) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();
  if (isLoading) return <AppLoading fullScreen />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!["admin", "superadmin", "staff"].includes(user.role))
    return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  // Show landing page immediately - don't wait for auth check
  // If user is logged in, they'll be redirected to dashboard after auth loads
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

// Wrapper for lazy-loaded routes - no loader, let pages render directly
function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<AppLoading fullScreen />}>{children}</Suspense>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<AppLoading fullScreen />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot" element={<ForgotPage />} />
          <Route path="/guest" element={<GuestCVEditorPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/jobs/explore" element={<PublicJobsPage />} />
          <Route path="/jobs" element={<JobBoardPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/cvs/browse" element={<PublicCVBrowsePage />} />
          <Route
            path="/interview/shared/:shareToken"
            element={<SharedInterviewPage />}
          />
          <Route path="/cv/:username/:slug" element={<PublicCVPage />} />
          <Route path="/profile/:username" element={<PublicProfilePage />} />

          <Route path="/about" element={<AboutPage />} />
          <Route path="/why-axiom" element={<WhyAxiomPage />} />
          <Route path="/terms-privacy" element={<LegalPage />} />
          <Route path="/faq" element={<FAQPage />} />

          <Route path="/cv/print/:id" element={<CVPrintPage />} />
          <Route path="/cv/print" element={<CVPrintPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="cv/new" element={<CVNewPage />} />
            <Route path="saved-jobs" element={<SavedJobsPage />} />
            <Route
              path="tracker"
              element={<Navigate to="/saved-jobs" replace />}
            />
            <Route path="interview" element={<InterviewStartPage />} />
            <Route
              path="interview/history"
              element={<InterviewHistoryPage />}
            />
            <Route
              path="interview/:sessionId"
              element={<InterviewSessionPage />}
            />
            <Route
              path="interview/review"
              element={<InterviewReviewCardsPage />}
            />
            <Route
              path="interview/:sessionId/review"
              element={<InterviewReviewPage />}
            />
            <Route path="skill-gap" element={<SkillGapPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>

          {/* These two are standalone — need their own Suspense */}
          <Route
            path="/cv/:id"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <CVEditorPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Suspense fallback={null}>
                  <AdminLayout />
                </Suspense>
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit" element={<AdminAuditLog />} />
            <Route path="cvs" element={<AdminCVs />} />
            <Route path="feedback" element={<AdminFeedback />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="push" element={<AdminPushSubscriptions />} />
            <Route path="email" element={<EmailComposePage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
