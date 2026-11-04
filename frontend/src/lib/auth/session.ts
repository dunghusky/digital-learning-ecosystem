import type { TokenPair } from "@/lib/api/auth";
import { ApiError, apiSend } from "@/lib/api/client";

/**
 * Where the signed-in session lives in the browser. Kept behind these functions so the
 * storage can change (e.g. to httpOnly cookies) without touching the components.
 */
const STORAGE_KEY = "langnghe.session";

/** Fired on this tab when the session is saved or cleared; other tabs get a "storage" event. */
export const SESSION_EVENT = "langnghe:session";

function announce(): void {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function saveSession(tokens: TokenPair): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Private mode or blocked storage: nothing persists, the user signs in again later.
  }
  announce();
}

export function readSession(): TokenPair | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenPair) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored, nothing to clear.
  }
  announce();
}

/** Calls `listener` whenever the session changes in this tab or another one. */
export function onSessionChange(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Only same-site paths are allowed after login, so `?next=` cannot redirect elsewhere. */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/**
 * One refresh at a time: several requests failing together share it. The backend rotates
 * refresh tokens, so two parallel refreshes would make the second one use a retired token.
 */
let refreshing: Promise<TokenPair | null> | null = null;

function refreshSession(current: TokenPair): Promise<TokenPair | null> {
  refreshing ??= apiSend<TokenPair>("/auth/token/refresh/", { body: { refresh: current.refresh } })
    .then((tokens) => {
      saveSession(tokens);
      return tokens;
    })
    .catch((error: unknown) => {
      // Expired or revoked: the session is over. A network error keeps it for a retry.
      if (error instanceof ApiError && error.status !== 0) clearSession();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Calls the API as the signed-in user. When the access token has expired (401) it refreshes
 * once and retries, so a 30-minute access token never interrupts a lesson.
 */
export async function authSend<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const session = readSession();
  if (!session) {
    throw new ApiError(401, "Not signed in");
  }
  try {
    return await apiSend<T>(path, { ...options, token: session.access });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const renewed = await refreshSession(session);
    if (!renewed) throw error;
    return apiSend<T>(path, { ...options, token: renewed.access });
  }
}

/** Revokes the refresh token on the server (best effort), then forgets the session. */
export async function signOut(): Promise<void> {
  const session = readSession();
  clearSession();
  if (session) {
    await apiSend("/auth/logout/", { body: { refresh: session.refresh } }).catch(() => undefined);
  }
}
