import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { getHomeRouteForRole } from "./lib/roleHome";
import { LoginPage } from "./pages/LoginPage";
import { ManagerDashboardPage } from "./pages/ManagerDashboardPage";
import { TablesPage } from "./pages/TablesPage";
import { WaitersPage } from "./pages/WaitersPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function RoleBasedRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="centered-loading">Loading your account…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeRouteForRole(user.role)} replace />;
}

function AppRoutes() {
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<RoleBasedRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/waiters"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <WaitersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoute allowedRoles={["WAITER"]}>
              <TablesPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  );
}
