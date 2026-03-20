import { Routes, Route, Navigate } from "react-router-dom";
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
import AccountPage from "./pages/dashboard/AccountPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCVs from "./pages/admin/AdminCVs";
import AdminRatings from "./pages/admin/AdminRatings";
import AdminFeedback from "./pages/admin/AdminFeedback";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!["admin", "superadmin", "staff"].includes(user.role))
    return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return null;
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
        <Route path="/explore" element={<PublicFeedPage />} />
        <Route path="/cv/:username/:slug" element={<PublicCVPage />} />
        <Route path="/profile/:username" element={<PublicProfilePage />} />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <FeedbackWidget />
    </>
  );
}
