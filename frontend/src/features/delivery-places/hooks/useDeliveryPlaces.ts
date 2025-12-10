/**
 * Delivery Places Hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDeliveryPlace,
  deleteDeliveryPlace,
  fetchDeliveryPlaces,
  updateDeliveryPlace,
  type DeliveryPlaceCreate,
  type DeliveryPlaceUpdate,
} from "../api";

const QUERY_KEY = ["delivery-places"] as const;

export function useDeliveryPlaces(customerId?: number) {
  return useQuery({
    queryKey: customerId ? [...QUERY_KEY, { customerId }] : QUERY_KEY,
    queryFn: () => fetchDeliveryPlaces(customerId),
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
