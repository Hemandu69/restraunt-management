import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";

interface NavItem {
  to: string;
  label: string;
}

// MANAGER and WAITER get entirely different, hard-coded link lists - never
// the same list with some items hidden/disabled. Items are only ever added
// here once the page they point to actually exists (no placeholder links
// for unbuilt modules like Menu, Sales, or Reports).
const MANAGER_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/waiters", label: "Waiters" },
];

const WAITER_NAV: NavItem[] = [{ to: "/tables", label: "Tables" }];

export function Navbar() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  if (!user) return null;

  const navItems = user.role === "MANAGER" ? MANAGER_NAV : WAITER_NAV;

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
    } catch {
      setLogoutError("Couldn't log out - check your connection and try again.");
    } finally {
      // Navbar stays mounted across the whole app (it lives above <Routes>,
      // outside ProtectedRoute) and just renders null while signed out, so
      // this state must always be reset here - it does NOT get a fresh
      // component instance (and fresh state) on the next login.
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="navbar">
      <span className="navbar-brand">
        <span className="navbar-mark" aria-hidden="true">
          R
        </span>
        Restaurant Management
      </span>

      <nav className="navbar-links" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `navbar-link${isActive ? " active" : ""}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="navbar-user">
        <div className="navbar-user-info">
          <Avatar name={user.name} />
          <span className="navbar-user-name">{user.name}</span>
          <span className="navbar-user-role muted">{user.role === "MANAGER" ? "Manager" : "Waiter"}</span>
        </div>
        {logoutError && (
          <span className="muted" style={{ color: "var(--color-danger)", fontSize: "0.8rem" }} role="alert">
            {logoutError}
          </span>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? "Logging out…" : "Log out"}
        </button>
      </div>
    </header>
  );
}
