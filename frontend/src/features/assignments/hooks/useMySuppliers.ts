/**
 * useMySupplers.ts
 *
 * 現在のユーザーの主担当仕入先情報を取得するフック
 */

import { useQuery } from "@tanstack/react-query";

import type { SupplierAssignment } from "../types";

import { http } from "@/shared/api/http-client";

export interface MySuppliersResponse {
  user_id: number;
  primary_supplier_ids: number[];
  all_supplier_ids: number[];
  assignments?: SupplierAssignment[];
}

/**
 * ユーザーの担当仕入先情報を取得
 * userIdが未指定の場合は現在のログインユーザーの情報を取得
 */
export function useMySuppliers(userId?: number) {
  return useQuery({
    queryKey: ["user-suppliers", userId],
    queryFn: async () => {
      if (userId) {
        // 特定のユーザーの全担当を取得
        const assignments = await http.get<SupplierAssignment[]>(`assignments/user/${userId}`);
        return {
          user_id: userId,
          primary_supplier_ids: [], // 非推奨
          all_supplier_ids: assignments.map((a) => a.supplier_id),
          assignments, // 実データも返すように拡張
        };
      }
      // 現在のログインユーザーのサマリーを取得
      return http.get<MySuppliersResponse>("assignments/my-suppliers");
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
