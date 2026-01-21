let currentRequestId: string | null = null;

/**
 * Generate a UUID v4
 * Fallback for environments where crypto.randomUUID() is not available
 */
const generateUUID = (): string => {
  // Try to use crypto.randomUUID() if available (modern browsers, HTTPS)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: Generate UUID v4 manually
  // Based on: https://stackoverflow.com/a/2117523
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const createRequestId = () => {
  const requestId = generateUUID();
  currentRequestId = requestId;
  return requestId;
};

export const getRequestId = () => currentRequestId;
