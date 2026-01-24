let authExpired = false;

export function setAuthExpired(expired: boolean) {
  authExpired = expired;
}

export function isAuthExpired() {
  return authExpired;
}
