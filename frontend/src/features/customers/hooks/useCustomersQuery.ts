/**
 * useCustomersQuery
 * 得意先一覧取得用のReact Query Hook
 */

import { useQuery } from "@tanstack/react-query";

import { listCustomers, type Customer } from "../api/customers-api";

export const CUSTOMERS_QUERY_KEY = ["customers"] as const;

/**
 * 得意先一覧を取得するHook
 */
export function useCustomersQuery() {
  return useQuery<Customer[], Error>({
    queryKey: CUSTOMERS_QUERY_KEY,
    queryFn: listCustomers,
  });
}
