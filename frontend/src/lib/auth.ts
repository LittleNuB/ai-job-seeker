const TOKEN_KEY = "auth_token";
const EMAIL_KEY = "auth_email";

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
}

export function clearAuthSession(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
