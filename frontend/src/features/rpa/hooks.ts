/**
 * RPA Hooks
 * TanStack Query hooks for RPA operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  executeMaterialDeliveryDocument,
  executeMaterialDeliveryStep1,
  executeMaterialDeliveryStep2,
  executeGenericCloudFlow,
  getCloudFlowConfigOptional,
  getMaterialDeliverySimpleHistory,
  deleteMaterialDeliverySimpleHistory,
  getCloudFlowConfig,
  updateCloudFlowConfig,
  type MaterialDeliveryDocumentRequest,
  type MaterialDeliverySimpleRequest,
  type CloudFlowConfigUpdate,
  type GenericCloudFlowExecuteRequest,
  type CloudFlowConfigResponse,
} from "./api";

/**
 * 素材納品書発行のmutation hook
 */
export function useExecuteMaterialDeliveryDocument() {
  return useMutation({
    mutationFn: (request: MaterialDeliveryDocumentRequest) =>
      executeMaterialDeliveryDocument(request),
  });
}

export function useExecuteMaterialDeliveryStep1() {
  return useMutation({
    mutationFn: (request: MaterialDeliverySimpleRequest) => executeMaterialDeliveryStep1(request),
  });
}

export function useExecuteMaterialDeliveryStep2() {
  return useMutation({
    mutationFn: (request: MaterialDeliverySimpleRequest) => executeMaterialDeliveryStep2(request),
  });
}

export function useMaterialDeliverySimpleHistory(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ["rpa", "material-delivery-simple", "history", limit, offset],
    queryFn: () => getMaterialDeliverySimpleHistory(limit, offset),
  });
}

export function useDeleteMaterialDeliverySimpleHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMaterialDeliverySimpleHistory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rpa", "material-delivery-simple", "history"] });
    },
  });
}

export function useExecuteGenericCloudFlow() {
  return useMutation({
    mutationFn: (request: GenericCloudFlowExecuteRequest) => executeGenericCloudFlow(request),
  });
}

export function useCloudFlowConfig(key: string, options?: { enabled?: boolean }) {
  return useQuery<CloudFlowConfigResponse>({
    queryKey: ["rpa", "config", key],
    queryFn: () => getCloudFlowConfig(key),
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
  });
}

export function useCloudFlowConfigOptional(key: string, options?: { enabled?: boolean }) {
  return useQuery<CloudFlowConfigResponse | null>({
    queryKey: ["rpa", "config", key],
    queryFn: () => getCloudFlowConfigOptional(key),
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
  });
}

export function useUpdateCloudFlowConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: CloudFlowConfigUpdate }) =>
      updateCloudFlowConfig(key, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rpa", "config", variables.key] });
    },
  });
}
