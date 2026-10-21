/**
 * Session helpers.
 *
 * For now the "who is signed in" state lives in localStorage because the app
 * runs entirely on mock data. When you connect the real REST backend, replace
 * this with token storage (e.g. a JWT from POST /auth/login) kept here or in
 * an httpOnly cookie handled by the backend.
 */

const SESSION_KEY = "harzgram_session_username";

export function getSessionUsername(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function setSessionUsername(username: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, username);
}

export function clearSessionUsername(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
