/**
 * useCustomerQuery
 * 得意先詳細取得用のReact Query Hook
 */

import { useQuery } from "@tanstack/react-query";

import { getCustomer, type Customer } from "../api/customers-api";

/**
 * 得意先詳細を取得するHook
 */
export function useCustomerQuery(customerCode: string | undefined) {
  return useQuery<Customer, Error>({
    queryKey: ["customers", customerCode],
    queryFn: () => getCustomer(customerCode!),
    enabled: !!customerCode,
  });
}
