import { useState, useEffect, useCallback } from "react";

import { http } from "@/shared/api/http-client";
import { type QueueStatusResponse } from "@/types/executionQueue";

export const useExecutionQueue = (resourceType: string, resourceId: string) => {
  const [data, setData] = useState<QueueStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await http.get<QueueStatusResponse>("execution-queue/status", {
        searchParams: { resource_type: resourceType, resource_id: resourceId },
      });
      setData(res);
      setError(null);
    } catch (err: unknown) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  const cancelTask = async (queueId: number) => {
    try {
      await http.delete(`execution-queue/${queueId}`);
      await fetchStatus();
    } catch (err) {
      console.error("Failed to cancel task", err);
      throw err;
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { data, loading, error, refresh: fetchStatus, cancelTask };
};
