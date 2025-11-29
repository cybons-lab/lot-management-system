import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { UomConversion } from "../api";

export const useUomConversions = () => {
    return useMasterApi<UomConversion>("masters/uom-conversions", "uom-conversions");
};
