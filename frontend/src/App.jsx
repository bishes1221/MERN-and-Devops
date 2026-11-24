import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Shell, LoadingState } from "./components/Shared";
import {
  AdminPage,
  AuthPage,
  BucketListDetailPage,
  CollectionDetailPage,
  CollectionsPage,
  CuratorPage,
  CuratorApplyPage,
  CuratorProfilePage,
  CuratorManagePage,
  DashboardPage,
  ExplorerProfilePage,
  ExplorePage,
  GemDetailPage,
  GemFormPage,
  LandingPage,
  LeaderboardPage,
  NotificationsPage,
  NotFoundPage,
  SavedPage,
  SettingsPage,
  SubmittedGemsPage,
  TrailDetailPage,
  TrailsPage,
} from "./pages/Pages";

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="content-page"><LoadingState label="Checking your neighborhood pass…" /></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function RoutesView() {
  return <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/explore" element={<ExplorePage />} />
    <Route path="/gems/new" element={<Protected><GemFormPage /></Protected>} />
    <Route path="/gems/:id/edit" element={<Protected><GemFormPage /></Protected>} />
    <Route path="/gems/:id" element={<GemDetailPage />} />
    <Route path="/my-gems" element={<Protected><SubmittedGemsPage /></Protected>} />
    <Route path="/explorers/:id" element={<ExplorerProfilePage />} />
    <Route path="/curators/apply" element={<Protected><CuratorApplyPage /></Protected>} />
    <Route path="/curator/manage" element={<Protected roles={["curator"]}><CuratorManagePage /></Protected>} />
    <Route path="/curators/:id" element={<CuratorProfilePage />} />
    <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
    <Route path="/dashboard/admin" element={<Protected roles={["admin"]}><AdminPage /></Protected>} />
    <Route path="/saved" element={<Protected><SavedPage /></Protected>} />
    <Route path="/bucket-lists/:id" element={<Protected><BucketListDetailPage /></Protected>} />
    <Route path="/curators" element={<CuratorPage />} />
    <Route path="/collections" element={<CollectionsPage />} />
    <Route path="/collections/:id" element={<CollectionDetailPage />} />
    <Route path="/trails/:id" element={<TrailDetailPage />} />
    <Route path="/trails" element={<TrailsPage />} />
    <Route path="/leaderboard" element={<LeaderboardPage />} />
    <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
    <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}

export default function App() {
  return <AuthProvider><BrowserRouter><Shell><RoutesView /></Shell><Toaster position="bottom-right" toastOptions={{ duration: 3600, style: { background: "#243d32", color: "#fff", borderRadius: "12px", fontSize: "14px" } }} /></BrowserRouter></AuthProvider>;
}
