import type { UomConversionResponse as UomConversion, UomConversionUpdate } from "../api";

import { useMasterApi } from "@/shared/hooks/useMasterApi";

export const useUomConversions = () => {
  return useMasterApi<UomConversion, UomConversion, UomConversionUpdate>(
    "masters/uom-conversions",
    "uom-conversions",
  );
};
