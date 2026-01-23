export const AUTH_TOKEN_STORAGE_KEY = "token";

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function hasAuthToken(): boolean {
  const token = getAuthToken();
  return Boolean(token && token.trim().length > 0);
}
