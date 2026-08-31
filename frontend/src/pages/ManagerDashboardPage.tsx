import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// The Manager's primary question is "how is my restaurant doing?" - future
// phases add real KPIs here (today's revenue, completed sales, order
// count, average order value, payment breakdown, table/waiter activity).
// None of that data exists yet (no tables/orders/payments module), so this
// stays a lightweight placeholder rather than fabricated numbers. This is
// intentionally NOT an operational POS screen - that's Tables, for Waiters.
export function ManagerDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.name}</h1>
          <p className="muted">Here's a quick way to get to what you manage.</p>
        </div>
      </div>

      <div className="card stack">
        <div>
          <h2>Waiter Management</h2>
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            Add waiter accounts and update their details.
          </p>
        </div>
        <div className="quick-actions">
          <Link to="/waiters" className="btn btn-primary">
            Manage Waiters
          </Link>
        </div>
      </div>

      <div className="card stack">
        <div>
          <h2>Coming later</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            Today's revenue, order count, average order value, payment breakdown, table activity, and sales
            reports will appear here once the tables/orders/billing modules are built.
          </p>
        </div>
      </div>
    </div>
  );
}
