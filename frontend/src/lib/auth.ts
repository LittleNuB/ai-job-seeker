const TOKEN_KEY = "auth_token";
const EMAIL_KEY = "auth_email";
export const AUTH_CHANGED_EVENT = "ai-job-copilot-auth-changed";

export class AuthRequiredError extends Error {
  constructor(message = "请先登录后再继续操作") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAuthToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthEmail(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(EMAIL_KEY);
}

export function setAuthSession(token: string, email: string): void {
  if (!canUseStorage()) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearAuthSession(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken());
}

export function getLoginPath(nextPath?: string): string {
  const fallback = "/";
  const next = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : fallback;
  return `/auth?next=${encodeURIComponent(next)}`;
}

export function getCurrentPath(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function redirectToLogin(nextPath = getCurrentPath()): void {
  if (typeof window === "undefined") return;
  window.location.href = getLoginPath(nextPath);
}

export function requireAuth(nextPath?: string): boolean {
  if (isAuthenticated()) return true;
  redirectToLogin(nextPath);
  return false;
}
