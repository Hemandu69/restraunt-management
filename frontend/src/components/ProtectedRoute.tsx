import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/user";
import { getHomeRouteForRole } from "../lib/roleHome";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

// This gate only controls what the UI *shows* - it exists for a clean,
// role-appropriate experience (HCI: recognition over recall, minimal
// cognitive load). It is NOT the security boundary: every API request is
// independently authorized on the backend (requirePermission middleware)
// regardless of what this component does or does not render. A Waiter user
// who edits the frontend bundle, or calls the API directly with curl/
// Postman, is still rejected server-side.
//
// A role mismatch redirects straight to that user's own home rather than
// rendering the page it was gated for even briefly - Manager-only content
// (e.g. the dashboard) must never flash on screen for a Waiter account. The
// destination page reads `deniedFrom` from navigation state to show a brief
// one-off notice rather than silently teleporting the user with no
// explanation.
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="centered-loading">Loading your account…</div>;
  }

  if (!user) {
    // No "return to where you were" state on purpose - see LoginPage for
    // why preserving a `from` location here caused a cross-session bug.
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace state={{ deniedFrom: location.pathname }} />;
  }

  return <>{children}</>;
}
