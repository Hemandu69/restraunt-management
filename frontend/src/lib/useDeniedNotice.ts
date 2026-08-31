import { useLocation } from "react-router-dom";

// ProtectedRoute redirects a role mismatch here with `deniedFrom` in
// navigation state, so the landing page can explain *why* the user ended up
// here instead of silently teleporting them (recognition over recall).
export function useDeniedNotice(): string | null {
  const location = useLocation();
  const deniedFrom = (location.state as { deniedFrom?: string } | null)?.deniedFrom;
  return deniedFrom ? `You don't have access to ${deniedFrom} with this account.` : null;
}
