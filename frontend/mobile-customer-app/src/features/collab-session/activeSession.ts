import AsyncStorage from "@react-native-async-storage/async-storage";

// Tracks the group-planning session this device is "inside" (if any) -
// RN equivalent of the web app's src/utils/collabSession.ts (AsyncStorage
// instead of localStorage). Lets ProviderDetailsScreen offer "Add to
// Group Session" whenever one is active, same as the web app.
const ACTIVE_SESSION_KEY = "ox_active_collab_session";

export interface ActiveCollabSession {
  sessionId: string;
  participantId: string;
  displayName: string;
}

export async function getActiveCollabSession(): Promise<ActiveCollabSession | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setActiveCollabSession(session: ActiveCollabSession) {
  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

export async function clearActiveCollabSession() {
  await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
}
