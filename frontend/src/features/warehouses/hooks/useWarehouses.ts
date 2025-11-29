import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { Warehouse } from "../api";

export const useWarehouses = () => {
    return useMasterApi<Warehouse>("/warehouses", "warehouses");
};
