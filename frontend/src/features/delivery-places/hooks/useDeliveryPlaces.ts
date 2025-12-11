/**
 * Delivery Places Hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDeliveryPlace,
  deleteDeliveryPlace,
  fetchDeliveryPlaces,
  permanentDeleteDeliveryPlace,
  softDeleteDeliveryPlace,
  updateDeliveryPlace,
  type DeliveryPlaceCreate,
  type DeliveryPlaceUpdate,
} from "../api";

const QUERY_KEY = ["delivery-places"] as const;

export function useDeliveryPlaces(params?: { customerId?: number; includeInactive?: boolean }) {
  return useQuery({
    queryKey: params ? [...QUERY_KEY, params] : QUERY_KEY,
    queryFn: () => fetchDeliveryPlaces(params),
  });
}

export function useCreateDeliveryPlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeliveryPlaceCreate) => createDeliveryPlace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
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
    },
  });
}

export function useDeleteDeliveryPlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteDeliveryPlace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
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
    },
  });
}

export function usePermanentDeleteDeliveryPlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => permanentDeleteDeliveryPlace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
