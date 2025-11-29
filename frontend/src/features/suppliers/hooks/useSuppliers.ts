import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { Supplier } from "../api";

export const useSuppliers = () => {
    return useMasterApi<Supplier>("/masters/suppliers", "suppliers");
};
