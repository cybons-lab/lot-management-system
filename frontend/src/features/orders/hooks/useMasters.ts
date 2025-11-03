// features/orders/hooks/useMasters.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/**
 * 得意先のデフォルト出荷倉庫を取得する将来拡張用フック。
 * 現状は API 未実装でも落ちないようにフェールセーフで空配列を返します。
 */
export function useCustomerDefaultWarehouses(customerCode?: string) {
  return useQuery<any[]>({
    queryKey: ["masters", "customer-default-warehouses", customerCode ?? ""],
    enabled: !!customerCode,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        // 実装済みなら呼ぶ（未実装でもビルドが通るようにガード）
        // @ts-ignore
        if (api && typeof api.getCustomerDefaultWarehouses === "function") {
          // @ts-ignore
          return await api.getCustomerDefaultWarehouses(customerCode!);
        }
      } catch {
        // API 実装途中や通信失敗時は空配列にフォールバック
      }
      return [];
    },
  });
}
