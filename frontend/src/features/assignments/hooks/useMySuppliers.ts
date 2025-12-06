/**
 * useMySupplers.ts
 * 
 * 現在のユーザーの主担当仕入先情報を取得するフック
 */

import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http-client";

interface MySuppliersResponse {
    user_id: number;
    primary_supplier_ids: number[];
    all_supplier_ids: number[];
}

/**
 * 現在のユーザーの主担当仕入先IDリストを取得
 */
export function useMySuppliers() {
    return useQuery({
        queryKey: ["my-suppliers"],
        queryFn: async () => {
            return http.get<MySuppliersResponse>("assignments/my-suppliers");
        },
        staleTime: 5 * 60 * 1000, // 5分間キャッシュ
        retry: false, // 認証エラー時はリトライしない
    });
}

/**
 * 指定したsupplier_idが主担当かどうかを判定するヘルパー
 */
export function isPrimarySupplier(
    supplierId: number | undefined | null,
    primarySupplierIds: number[] | undefined
): boolean {
    if (!supplierId || !primarySupplierIds) return false;
    return primarySupplierIds.includes(supplierId);
}
