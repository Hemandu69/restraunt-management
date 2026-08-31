import type { Role } from "../types/user";

// Role is never conveyed by color alone: a dot plus a text label carries
// the meaning, so the badge reads correctly for colorblind users too.
export function RoleBadge({ role }: { role: Role }) {
  const isManager = role === "MANAGER";
  return (
    <span className={`badge ${isManager ? "badge-manager" : "badge-waiter"}`}>
      <span className="badge-dot" aria-hidden="true" />
      {isManager ? "Manager" : "Waiter"}
    </span>
  );
}
