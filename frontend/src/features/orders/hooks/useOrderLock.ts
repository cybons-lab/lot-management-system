import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { acquireOrderLock, releaseOrderLock } from "../api";

import { QUERY_KEYS } from "@/services/api/query-keys";

export function useOrderLock(orderId: number, enabled: boolean = true) {
  const queryClient = useQueryClient();

  const { mutate: acquire } = useMutation({
    mutationFn: () => acquireOrderLock(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders.detail(orderId) });
    },
  });

  const { mutate: release } = useMutation({
    mutationFn: () => releaseOrderLock(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders.detail(orderId) });
    },
  });

  // Acquire lock when component mounts or enabled becomes true
  useEffect(() => {
    if (enabled) {
      acquire();
    }
  }, [orderId, enabled, acquire]);

  // Release lock when component unmounts or enabled becomes false
  useEffect(() => {
    return () => {
      if (enabled) {
        release();
      }
    };
  }, [orderId, enabled, release]);

  return { acquire, release };
}
