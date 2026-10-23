/**
 * Session helpers.
 *
 * In mock mode the "who is signed in" state lives in localStorage. The real
 * REST backend manages authentication in its own HTTP-only server-side
 * session cookie, so no API token is stored here.
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
