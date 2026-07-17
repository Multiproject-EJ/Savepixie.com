import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { ensureProfile } from "../features/profile/api";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  sessionError: string | null;
  recoveryMode: boolean;
  retrySession: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    profile?: { displayName?: string | null; username?: string | null }
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(
    () =>
      window.location.hash.includes("type=recovery") ||
      new URLSearchParams(window.location.search).get("type") === "recovery"
  );

  useEffect(() => {
    let mounted = true;
    let authEventReceived = false;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!mounted || authEventReceived) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setSessionError(null);
      })
      .catch(() => {
        if (!mounted || authEventReceived) return;
        setSession(null);
        setUser(null);
        setSessionError(
          "We couldn’t check your SavePixie session. Check your connection and retry."
        );
      })
      .finally(() => {
        if (mounted && !authEventReceived) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventReceived = true;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      setSessionError(null);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
      if (nextSession?.user) {
        // Supabase warns against starting another API request inside this callback.
        window.setTimeout(() => {
          void ensureProfile(nextSession.user).catch((error) =>
            console.error("SavePixie could not prepare the customer profile", error)
          );
        }, 0);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const retrySession = useCallback(async () => {
    setLoading(true);
    setSessionError(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setSession(data.session);
      setUser(data.session?.user ?? null);
    } catch {
      setSession(null);
      setUser(null);
      setSessionError("We couldn’t check your SavePixie session. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      await ensureProfile(data.user);
    }
  }, []);

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      profile?: { displayName?: string | null; username?: string | null }
    ) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: profile?.displayName ?? null,
            username: profile?.username ?? null,
          },
        },
      });
      if (error) throw error;
      if (data.user && data.session) {
        await ensureProfile(data.user, {
          display_name: profile?.displayName ?? null,
          username: profile?.username ?? null,
        });
      }
      return { requiresEmailConfirmation: !data.session };
    },
    []
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setRecoveryMode(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      sessionError,
      recoveryMode,
      retrySession,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [
      loading,
      recoveryMode,
      resetPassword,
      retrySession,
      session,
      sessionError,
      signInWithPassword,
      signOut,
      signUpWithPassword,
      updatePassword,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
