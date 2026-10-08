// Tracks the group-planning session the current browser tab is
// "inside" (if any), so other pages - like a provider's details page -
// can offer an "Add to Group Session" action alongside the normal
// "Add to Cart" one. Session-scoped, not user-namespaced like cart.ts:
// a guest participant may not even have an OccasionX account.

const ACTIVE_SESSION_KEY = "ox_active_collab_session";

export interface ActiveCollabSession {
  sessionId: string;
  participantId: string;
  displayName: string;
}

export function getActiveCollabSession(): ActiveCollabSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveCollabSession(session: ActiveCollabSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

export function clearActiveCollabSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}
