import { lazy, Suspense } from "react";
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
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const CVEditorPage = lazy(() => import("./pages/cv/CVEditorPage"));
const CVNewPage = lazy(() => import("./pages/cv/CVNewPage"));
const CVPrintPage = lazy(() => import("./pages/cv/CVPrintPage"));
const GuestCVEditorPage = lazy(() => import("./pages/cv/GuestCVEditorPage"));
const PublicCVPage = lazy(() => import("./pages/public/PublicCVPage"));
const PublicProfilePage = lazy(() => import("./pages/public/PublicProfilePage"));
const PublicFeedPage = lazy(() => import("./pages/public/PublicFeedPage"));
const CompanyPublicPage = lazy(() => import("./pages/public/CompanyPublicPage"));
const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const WhyAxiomPage = lazy(() => import("./pages/public/WhyAxiomPage"));
const LegalPage = lazy(() => import("./pages/public/LegalPage"));
const RecruiterHelpPage = lazy(() => import("./pages/public/RecruiterHelpPage"));
const AccountPage = lazy(() => import("./pages/dashboard/AccountPage"));
const JobBoardPage = lazy(() => import("./pages/jobs/JobBoardPage"));
const JobDetailPage = lazy(() => import("./pages/jobs/JobDetailPage"));
const PublicJobsPage = lazy(() => import("./pages/jobs/PublicJobsPage"));
const AxiomJobBoardPage = lazy(() => import("./pages/jobs/AxiomJobBoardPage"));
const AxiomJobDetailPage = lazy(() => import("./pages/jobs/AxiomJobDetailPage"));
const CreateJobPage = lazy(() => import("./pages/jobs/CreateJobPage"));
const EditJobPage = lazy(() => import("./pages/jobs/EditJobPage"));
const ApplicationTrackerPage = lazy(() => import("./pages/jobs/ApplicationTrackerPage"));
const InterviewStartPage = lazy(() => import("./pages/interview/InterviewStartPage"));
const InterviewSessionPage = lazy(() => import("./pages/interview/InterviewSessionPage"));
const InterviewReviewPage = lazy(() => import("./pages/interview/InterviewReviewPage"));
const LiveInterviewLobbyPage = lazy(() => import("./pages/interview/LiveInterviewLobbyPage"));
const LiveInterviewPage = lazy(() => import("./pages/interview/LiveInterviewPage"));
const RecruiterDashboard = lazy(() => import("./pages/recruiter/RecruiterDashboard"));
const RecruiterRegisterPage = lazy(() => import("./pages/recruiter/RecruiterRegisterPage"));
const RecruiterApplicationsPage = lazy(() => import("./pages/recruiter/RecruiterApplicationsPage"));
const TalentPoolsPage = lazy(() => import("./pages/recruiter/TalentPoolsPage"));
const CompanyProfilePage = lazy(() => import("./pages/recruiter/CompanyProfilePage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCVs = lazy(() => import("./pages/admin/AdminCVs"));
const AdminRatings = lazy(() => import("./pages/admin/AdminRatings"));
const AdminFeedback = lazy(() => import("./pages/admin/AdminFeedback"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const NotificationsPage = lazy(() => import("./pages/dashboard/NotificationsPage"));

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
  return (
    <Suspense fallback={<AppLoading fullScreen />}>
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LazyRoute>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot" element={<ForgotPage />} />
          <Route path="/guest" element={<GuestCVEditorPage />} />
          <Route path="/jobs/explore" element={<PublicJobsPage />} />
          <Route path="/jobs/axiom" element={<Navigate to="/jobs?source=axiom" replace />} />
          <Route path="/jobs/axiom/:id" element={<AxiomJobDetailPage />} />
          <Route path="/jobs" element={<JobBoardPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/explore" element={<PublicFeedPage />} />
          <Route path="/cv/:username/:slug" element={<PublicCVPage />} />
          <Route path="/profile/:username" element={<PublicProfilePage />} />
          <Route path="/company/:slug" element={<CompanyPublicPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/why-axiom" element={<WhyAxiomPage />} />
          <Route path="/terms-privacy" element={<LegalPage />} />
          <Route path="/recruiter/help" element={<RecruiterHelpPage />} />

          {/* Print route — bare page, no layout, no auth required for public CVs */}
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
            <Route path="tracker" element={<ApplicationTrackerPage />} />
            <Route path="recruiter" element={<RecruiterDashboard />} />
            <Route
              path="recruiter/register"
              element={<RecruiterRegisterPage />}
            />
            <Route path="recruiter/profile" element={<CompanyProfilePage />} />
            <Route
              path="recruiter/applications"
              element={<RecruiterApplicationsPage />}
            />
            <Route path="recruiter/talent-pools" element={<TalentPoolsPage />} />
            <Route path="jobs/axiom/new" element={<CreateJobPage />} />
            <Route path="jobs/axiom/:id/edit" element={<EditJobPage />} />
            <Route path="interview" element={<InterviewStartPage />} />
            <Route
              path="interview/:sessionId"
              element={<InterviewSessionPage />}
            />
            <Route
              path="interview/:sessionId/review"
              element={<InterviewReviewPage />}
            />
            <Route
              path="interview/live/:sessionId/lobby"
              element={<LiveInterviewLobbyPage />}
            />
            <Route
              path="interview/live/:sessionId"
              element={<LiveInterviewPage />}
            />
            <Route path="account" element={<AccountPage />} />
          </Route>

          <Route
            path="/cv/:id"
            element={
              <ProtectedRoute>
                <CVEditorPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit" element={<AdminAuditLog />} />
            <Route path="cvs" element={<AdminCVs />} />
            <Route path="ratings" element={<AdminRatings />} />
            <Route path="feedback" element={<AdminFeedback />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </LazyRoute>
    </ErrorBoundary>
  );
}
