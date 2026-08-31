import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomeRouteForRole } from "../lib/roleHome";

export function NotFoundPage() {
  const { user } = useAuth();
  const homePath = user ? getHomeRouteForRole(user.role) : "/login";

  return (
    <div className="page">
      <div className="empty-state card">
        <span className="empty-state-icon" aria-hidden="true">
          ?
        </span>
        <h3>Page not found</h3>
        <p>The page you're looking for doesn't exist or may have moved.</p>
        <Link to={homePath} className="btn btn-primary">
          Back to safety
        </Link>
      </div>
    </div>
  );
}
