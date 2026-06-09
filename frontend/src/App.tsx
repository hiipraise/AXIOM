import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import FeedbackWidget from "./components/FeedbackWidget";
import Layout from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPage from "./pages/auth/ForgotPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import CVEditorPage from "./pages/cv/CVEditorPage";
import CVNewPage from "./pages/cv/CVNewPage";
import CVPrintPage from "./pages/cv/CVPrintPage";
import GuestCVEditorPage from "./pages/cv/GuestCVEditorPage";
import PublicCVPage from "./pages/public/PublicCVPage";
import PublicProfilePage from "./pages/public/PublicProfilePage";
import PublicFeedPage from "./pages/public/PublicFeedPage";
import CompanyPublicPage from "./pages/public/CompanyPublicPage";
import AccountPage from "./pages/dashboard/AccountPage";
import JobBoardPage from "./pages/jobs/JobBoardPage";
import JobDetailPage from "./pages/jobs/JobDetailPage";
import PublicJobsPage from "./pages/jobs/PublicJobsPage";
import AxiomJobBoardPage from "./pages/jobs/AxiomJobBoardPage";
import AxiomJobDetailPage from "./pages/jobs/AxiomJobDetailPage";
import CreateJobPage from "./pages/jobs/CreateJobPage";
import EditJobPage from "./pages/jobs/EditJobPage";
import ApplicationTrackerPage from "./pages/jobs/ApplicationTrackerPage";
import InterviewStartPage from "./pages/interview/InterviewStartPage";
import InterviewSessionPage from "./pages/interview/InterviewSessionPage";
import InterviewReviewPage from "./pages/interview/InterviewReviewPage";
import LiveInterviewLobbyPage from "./pages/interview/LiveInterviewLobbyPage";
import LiveInterviewPage from "./pages/interview/LiveInterviewPage";
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import RecruiterRegisterPage from "./pages/recruiter/RecruiterRegisterPage";
import RecruiterApplicationsPage from "./pages/recruiter/RecruiterApplicationsPage";
import CompanyProfilePage from "./pages/recruiter/CompanyProfilePage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCVs from "./pages/admin/AdminCVs";
import AdminRatings from "./pages/admin/AdminRatings";
import AdminFeedback from "./pages/admin/AdminFeedback";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AppLoading from "./components/AppLoading";
import NotFoundPage from "./pages/NotFoundPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();
  if (isLoading) return <AppLoading fullScreen />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
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
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return <AppLoading fullScreen />;
  return user ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot" element={<ForgotPage />} />
        <Route path="/guest" element={<GuestCVEditorPage />} />
        <Route path="/jobs/explore" element={<PublicJobsPage />} />
        <Route path="/jobs/axiom" element={<AxiomJobBoardPage />} />
        <Route path="/jobs/axiom/:id" element={<AxiomJobDetailPage />} />
        <Route path="/jobs" element={<JobBoardPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/explore" element={<PublicFeedPage />} />
        <Route path="/cv/:username/:slug" element={<PublicCVPage />} />
        <Route path="/profile/:username" element={<PublicProfilePage />} />
        <Route path="/company/:slug" element={<CompanyPublicPage />} />

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
          <Route path="cv/new" element={<CVNewPage />} />
          <Route path="cv/:id" element={<CVEditorPage />} />
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
          <Route path="cvs" element={<AdminCVs />} />
          <Route path="ratings" element={<AdminRatings />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <FeedbackWidget />
    </>
  );
}
