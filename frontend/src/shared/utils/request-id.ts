let currentRequestId: string | null = null;

export const createRequestId = () => {
  const requestId = crypto.randomUUID();
  currentRequestId = requestId;
  return requestId;
};

export const getRequestId = () => currentRequestId;
