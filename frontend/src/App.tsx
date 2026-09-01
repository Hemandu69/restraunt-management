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
import { PublicPaymentPage } from "./pages/PublicPaymentPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function RoleBasedRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="centered-loading">Loading your account…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeRouteForRole(user.role)} replace />;
}

// The authenticated application: Navbar, role-gated routes, AuthContext.
// Deliberately NOT where the public payment page lives - see App() below.
function AuthedApp() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Public, unauthenticated, isolated from the authenticated app
            (spec section 7): no AuthProvider, no Navbar, no app-shell - a
            customer who scans a QR code never touches any of that, even by
            accident. Must be matched before the authenticated app's own
            catch-all "*" route. */}
        <Route path="/pay/:token" element={<PublicPaymentPage />} />
        <Route path="/*" element={<AuthedApp />} />
      </Routes>
    </ToastProvider>
  );
}
