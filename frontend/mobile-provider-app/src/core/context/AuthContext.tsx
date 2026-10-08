import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { DeviceEventEmitter } from "react-native";
import { AuthUser, getCurrentUser, login as apiLogin, logout as apiLogout } from "@/features/auth/authApi";
import { getAccessToken, SESSION_EXPIRED_EVENT } from "@/core/api/client";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isPaidMember: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    const stored = await getCurrentUser();
    setUser(stored);
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));

    // client.ts's response interceptor already tries a silent token
    // refresh on any 401; this only fires when that refresh itself
    // fails (refresh token expired/revoked, or no network) - drop back
    // to the sign-in screen instead of leaving stale UI that silently
    // 401s on every action.
    const sub = DeviceEventEmitter.addListener(SESSION_EXPIRED_EVENT, () => {
      setUser(null);
    });
    return () => sub.remove();
  }, [refreshUser]);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await apiLogin(identifier, password);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: !!user,
    isPaidMember: !!user?.isPaidMember,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
