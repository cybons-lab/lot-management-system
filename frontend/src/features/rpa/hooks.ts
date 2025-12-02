/**
 * RPA Hooks
 * TanStack Query hooks for RPA operations
 */

import { useMutation } from "@tanstack/react-query";

import { executeMaterialDeliveryDocument, type MaterialDeliveryDocumentRequest } from "./api";

/**
 * 素材納品書発行のmutation hook
 */
export function useExecuteMaterialDeliveryDocument() {
  return useMutation({
    mutationFn: (request: MaterialDeliveryDocumentRequest) =>
      executeMaterialDeliveryDocument(request),
  });
}
