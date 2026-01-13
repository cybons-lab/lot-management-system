/**
 * RPA Hooks
 * TanStack Query hooks for RPA operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  executeMaterialDeliveryDocument,
  executeGenericCloudFlow,
  getCloudFlowConfig,
  updateCloudFlowConfig,
  type MaterialDeliveryDocumentRequest,
  type CloudFlowConfigUpdate,
  type GenericCloudFlowExecuteRequest,
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

export function useExecuteGenericCloudFlow() {
  return useMutation({
    mutationFn: (request: GenericCloudFlowExecuteRequest) => executeGenericCloudFlow(request),
  });
}

export function useCloudFlowConfig(key: string) {
  return useQuery({
    queryKey: ["rpa", "config", key],
    queryFn: () => getCloudFlowConfig(key),
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
