import type { UomConversionResponse as UomConversion } from "../api";

import { useMasterApi } from "@/shared/hooks/useMasterApi";

export const useUomConversions = () => {
  return useMasterApi<UomConversion>("masters/uom-conversions", "uom-conversions");
};
