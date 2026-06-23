import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface UserProfile {
  id:           string;
  email:        string;
  username:     string | null;
  display_name: string | null;
  role:         "user" | "admin" | "superadmin";
  kyc_status:   string;
  balance:      number;
  currency:     string;
}

interface AuthState {
  session:   Session | null;
  profile:   UserProfile | null;
  loading:   boolean;
  error:     string | null;
}

interface AuthContextValue extends AuthState {
  login:        (email: string, password: string) => Promise<{ ok: boolean; reason?: string }>;
  logout:       () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError:   () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: true,
    error:   null,
  });

  const fetchProfile = useCallback(async (session: Session): Promise<UserProfile | null> => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.ok ? (json.user as UserProfile) : null;
    } catch {
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const profile = await fetchProfile(session);
    setState((s) => ({ ...s, profile }));
  }, [fetchProfile]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const profile = await fetchProfile(session);
        setState({ session, profile, loading: false, error: null });
      } else {
        setState({ session: null, profile: null, loading: false, error: null });
      }
    });

    // Listen for auth state changes (token refresh, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          setState({ session: null, profile: null, loading: false, error: null });
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const profile = await fetchProfile(session);
          setState({ session, profile, loading: false, error: null });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; reason?: string }> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch("/api/auth/login", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (!json.ok) {
          const msg =
            json.reason === "invalid_credentials" ? "Invalid email or password" :
            json.reason === "too_many_attempts"   ? "Too many attempts. Try again in 15 min." :
            json.reason === "validation"          ? "Invalid input" :
            "Login failed. Please try again.";
          setState((s) => ({ ...s, loading: false, error: msg }));
          return { ok: false, reason: json.reason };
        }

        // Set the Supabase session from the backend-returned tokens
        const { error } = await supabase.auth.setSession({
          access_token:  json.access_token,
          refresh_token: json.refresh_token,
        });
        if (error) {
          setState((s) => ({ ...s, loading: false, error: "Session error" }));
          return { ok: false, reason: "session_error" };
        }

        setState((s) => ({ ...s, loading: false, error: null }));
        return { ok: true };
      } catch {
        setState((s) => ({ ...s, loading: false, error: "Network error" }));
        return { ok: false, reason: "network" };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    const session = state.session;
    if (session) {
      try {
        await fetch("/api/auth/logout", {
          method:  "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      } catch { /* ignore */ }
    }
    await supabase.auth.signOut();
    setState({ session: null, profile: null, loading: false, error: null });
  }, [state.session]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshProfile, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
