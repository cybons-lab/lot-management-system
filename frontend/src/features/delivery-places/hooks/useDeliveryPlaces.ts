/**
 * Delivery Places Hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createDeliveryPlace,
  deleteDeliveryPlace,
  fetchDeliveryPlaces,
  permanentDeleteDeliveryPlace,
  restoreDeliveryPlace,
  softDeleteDeliveryPlace,
  updateDeliveryPlace,
  type DeliveryPlaceCreate,
  type DeliveryPlaceUpdate,
} from "../api";

const QUERY_KEY = ["delivery-places"] as const;

export function useDeliveryPlaces(
  params?: { customerId?: number; includeInactive?: boolean },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: params ? [...QUERY_KEY, params] : QUERY_KEY,
    queryFn: () => fetchDeliveryPlaces(params),
    enabled: options?.enabled,
  });
}

export function useCreateDeliveryPlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeliveryPlaceCreate) => createDeliveryPlace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("納入先を登録しました");
    },
  });
}

export function useUpdateDeliveryPlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DeliveryPlaceUpdate }) =>
      updateDeliveryPlace(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("納入先を更新しました");
    },
  });
}

export function useDeleteDeliveryPlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteDeliveryPlace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("納入先を削除しました");
    },
  });
}

export function useSoftDeleteDeliveryPlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, endDate }: { id: number; endDate?: string }) =>
      softDeleteDeliveryPlace(id, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("納入先を無効化しました");
    },
  });
}

export function usePermanentDeleteDeliveryPlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => permanentDeleteDeliveryPlace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("納入先を完全に削除しました");
    },
  });
}

export function useRestoreDeliveryPlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => restoreDeliveryPlace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("納入先を復元しました");
    },
  });
}
