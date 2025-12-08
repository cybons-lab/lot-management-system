import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { acquireOrderLock, releaseOrderLock } from "../api";

import { QUERY_KEYS } from "@/services/api/query-keys";

/**
 * Check if user is authenticated by verifying token exists in localStorage
 */
function isAuthenticated(): boolean {
  const token = localStorage.getItem("token");
  return Boolean(token && token.trim().length > 0);
}

export function useOrderLock(orderId: number, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const [hasLock, setHasLock] = useState(false);

  const { mutate: acquire } = useMutation({
    mutationFn: () => acquireOrderLock(orderId),
    onSuccess: () => {
      setHasLock(true);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders.detail(orderId) });
    },
    onError: (error) => {
      // Silently handle auth errors - user may not be logged in
      // or may not have permission to lock orders
      setHasLock(false);
      if (import.meta.env.DEV) {
        console.debug("[useOrderLock] Failed to acquire lock:", error);
      }
    },
  });

  const { mutate: release } = useMutation({
    mutationFn: () => releaseOrderLock(orderId),
    onSuccess: () => {
      setHasLock(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders.detail(orderId) });
    },
    onError: (error) => {
      // Silently handle errors on release
      setHasLock(false);
      if (import.meta.env.DEV) {
        console.debug("[useOrderLock] Failed to release lock:", error);
      }
    },
  });

  // Acquire lock when component mounts or enabled becomes true
  // Only if user is authenticated
  useEffect(() => {
    if (enabled && isAuthenticated()) {
      acquire();
    }
  }, [orderId, enabled, acquire]);

  // Release lock when component unmounts or enabled becomes false
  // Only if we actually have the lock
  useEffect(() => {
    return () => {
      if (hasLock) {
        release();
      }
    };
  }, [hasLock, release]);

  return { acquire, release, hasLock };
}
