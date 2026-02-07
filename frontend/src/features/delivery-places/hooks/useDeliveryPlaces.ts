/**
 * Delivery Places Hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
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
  type DeliveryPlace,
} from "../api";

const QUERY_KEY = ["delivery-places"] as const;

export function useDeliveryPlaces(
  params?: { customerId?: number; includeInactive?: boolean },
  options?: { enabled?: boolean },
) {
  return useQuery<DeliveryPlace[]>({
    queryKey: params ? [...QUERY_KEY, params] : QUERY_KEY,
    queryFn: () => fetchDeliveryPlaces(params),
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
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
  const handleConflict = (error: unknown) => {
    if (error instanceof HTTPError && error.response?.status === 409) {
      toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      return true;
    }
    return false;
  };

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DeliveryPlaceUpdate }) =>
      updateDeliveryPlace(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("納入先を更新しました");
    },
    onError: (error) => {
      handleConflict(error);
    },
  });
}

export function useDeleteDeliveryPlace() {
  const queryClient = useQueryClient();
  const handleConflict = (error: unknown) => {
    if (error instanceof HTTPError && error.response?.status === 409) {
      toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      return true;
    }
    return false;
  };

  return useMutation({
    mutationFn: ({ id, version }: { id: number; version: number }) =>
      deleteDeliveryPlace(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("納入先を削除しました");
    },
    onError: (error) => {
      handleConflict(error);
    },
  });
}

export function useSoftDeleteDeliveryPlace() {
  const queryClient = useQueryClient();
  const handleConflict = (error: unknown) => {
    if (error instanceof HTTPError && error.response?.status === 409) {
      toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      return true;
    }
    return false;
  };

  return useMutation({
    mutationFn: ({ id, version, endDate }: { id: number; version: number; endDate?: string }) =>
      softDeleteDeliveryPlace(id, version, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("納入先を無効化しました");
    },
    onError: (error) => {
      handleConflict(error);
    },
  });
}

export function usePermanentDeleteDeliveryPlace() {
  const queryClient = useQueryClient();
  const handleConflict = (error: unknown) => {
    if (error instanceof HTTPError && error.response?.status === 409) {
      toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      return true;
    }
    return false;
  };

  return useMutation({
    mutationFn: ({ id, version }: { id: number; version: number }) =>
      permanentDeleteDeliveryPlace(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("納入先を完全に削除しました");
    },
    onError: (error) => {
      handleConflict(error);
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
