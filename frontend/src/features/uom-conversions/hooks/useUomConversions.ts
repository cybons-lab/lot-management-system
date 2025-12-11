import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createUomConversion,
  type UomConversionCreate,
  type UomConversionResponse as UomConversion,
  type UomConversionUpdate,
} from "../api";

import { useMasterApi } from "@/shared/hooks/useMasterApi";

export const useUomConversions = () => {
  return useMasterApi<UomConversion, UomConversionCreate, UomConversionUpdate>(
    "masters/uom-conversions",
    "uom-conversions",
  );
};

export function useCreateUomConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UomConversionCreate) => createUomConversion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uom-conversions"] });
    },
  });
}
