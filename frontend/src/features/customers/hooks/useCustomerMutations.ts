/**
 * useCustomerMutations
 * 得意先のCreate/Update/Delete/Bulk用のReact Query Mutation Hooks
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkUpsertCustomers,
  type CustomerCreate,
  type CustomerUpdate,
} from "../api";
import type { CustomerBulkRow } from "../types/bulk-operation";

import { CUSTOMERS_QUERY_KEY } from "./useCustomersQuery";

/**
 * 得意先作成Mutation
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CustomerCreate) => createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
    },
  });
}

/**
 * 得意先更新Mutation
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerCode, data }: { customerCode: string; data: CustomerUpdate }) =>
      updateCustomer(customerCode, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
    },
  });
}

/**
 * 得意先削除Mutation
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerCode: string) => deleteCustomer(customerCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
    },
  });
}

/**
 * 得意先一括インポートMutation
 *
 * TODO: backend: bulk-upsert API実装後、バックエンドAPIに切り替え
 */
export function useBulkUpsertCustomers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows: CustomerBulkRow[]) => bulkUpsertCustomers(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
    },
  });
}
