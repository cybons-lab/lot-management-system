import type { Customer, CustomerCreate, CustomerUpdate } from "../api";

import { useMasterApi } from "@/shared/hooks/useMasterApi";

export function useCustomers() {
  return useMasterApi<Customer, CustomerCreate, CustomerUpdate>("masters/customers", "customers");
}
