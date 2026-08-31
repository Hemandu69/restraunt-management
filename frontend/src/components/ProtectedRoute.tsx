import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
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
// A role mismatch redirects silently and immediately to that user's own
// home - Manager-only content (e.g. the dashboard) must never flash on
// screen for a Waiter account. This used to carry a "you don't have access
// to X" notice via navigation state, but that state stuck to the /tables
// history entry and kept reappearing across unrelated in-page interactions
// (switching tables, opening the menu) since none of that changes the URL.
// A route-authorization detail like this doesn't belong in the normal
// operational screen at all, so the redirect is silent.
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="centered-loading">Loading your account…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  }

  return <>{children}</>;
}
