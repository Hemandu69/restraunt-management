import { useAuth } from "../context/AuthContext";
import { Alert } from "../components/Alert";
import { EmptyState } from "../components/EmptyState";
import { useDeniedNotice } from "../lib/useDeniedNotice";

// Waiter's landing page and future primary workspace: select a table,
// start an order, add items, generate the bill, take payment. None of that
// exists yet, so this is deliberately just a placeholder - not a fake
// dashboard, not fabricated table data. It is intentionally not called
// "Dashboard" and carries no KPIs; that's the Manager's page.
export function TablesPage() {
  const { user } = useAuth();
  const deniedNotice = useDeniedNotice();

  if (!user) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Tables</h1>
          <p className="muted">Select a table to start or continue an order.</p>
        </div>
      </div>

      {deniedNotice && <Alert tone="info">{deniedNotice}</Alert>}

      <div className="card" style={{ marginTop: deniedNotice ? "1rem" : 0 }}>
        <EmptyState
          icon="▦"
          title="Table management is coming soon"
          description="Once available, your restaurant's tables will appear here so you can start an order, add items, and generate the bill without leaving this screen."
        />
      </div>
    </div>
  );
}
