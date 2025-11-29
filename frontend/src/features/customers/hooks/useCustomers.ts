import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { Customer, CustomerCreate, CustomerUpdate } from "../api";

export function useCustomers() {
  return useMasterApi<Customer, CustomerCreate, CustomerUpdate>("masters/customers", "customers");
}
