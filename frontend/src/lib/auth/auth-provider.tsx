"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import type { CurrentUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { authSend, onSessionChange, readSession, signOut } from "@/lib/auth/session";

/**
 * "loading" is also what the server renders: the session lives in the browser, so the
 * first paint never claims to know who is signed in (no hydration mismatch).
 */
export type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: CurrentUser };

interface AuthContextValue {
  state: AuthState;
  signOut: () => Promise<void>;
  /** Re-reads the profile, e.g. after editing it. */
  reload: () => Promise<void>;
}

const LOADING: AuthState = { status: "loading", user: null };
const ANONYMOUS: AuthState = { status: "anonymous", user: null };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(LOADING);

  const reload = useCallback(async () => {
    if (!readSession()) {
      setState(ANONYMOUS);
      return;
    }
    try {
      const user = await authSend<CurrentUser>("/auth/me/", { method: "GET" });
      setState({ status: "authenticated", user });
    } catch (error) {
      // Keep a known user through a network blip; anything else means signed out.
      if (error instanceof ApiError && error.status === 0) return;
      setState(ANONYMOUS);
    }
  }, []);

  useEffect(() => {
    // Initial load from the browser session; subscribe for logins, logouts and other tabs.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with localStorage
    void reload();
    return onSessionChange(() => void reload());
  }, [reload]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setState(ANONYMOUS);
  }, []);

  return <AuthContext value={{ state, signOut: handleSignOut, reload }}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return value;
}

/** The signed-in user, or null while loading or when signed out. */
export function useCurrentUser(): CurrentUser | null {
  return useAuth().state.user;
}
