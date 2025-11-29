import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { Customer } from "../api";

export const useCustomers = () => {
    return useMasterApi<Customer>("masters/customers", "customers");
};
