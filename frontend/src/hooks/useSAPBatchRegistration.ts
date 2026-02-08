/**
 * SAPバッチ登録用のカスタムフック
 *
 * 確定済み受注をSAPシステムに一括登録する機能を提供します。
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { integrationApi } from "@/shared/api/integration";

/**
 * SAPバッチ登録機能を提供するフック
 *
 * 選択された受注明細をSAPシステムに一括登録します。
 * 登録成功後は関連するクエリキャッシュを無効化して、
 * 最新のデータを再取得します。
 *
 * @returns オブジェクト
 * @returns registerToSAP - SAP登録を実行する関数
 * @returns isRegistering - 登録処理中かどうかのフラグ
 *
 * @example
 * ```tsx
 * const { registerToSAP, isRegistering } = useSAPBatchRegistration();
 *
 * const handleRegister = () => {
 *   registerToSAP([lineId1, lineId2, lineId3]);
 * };
 * ```
 */
export function useSAPBatchRegistration() {
  const queryClient = useQueryClient();

  const { mutate: registerToSAP, isPending: isRegistering } = useMutation({
    mutationFn: async (lineIds: number[]) => {
      return await integrationApi.registerSalesOrders({
        order_ids: lineIds, // API仕様: order_idsだが実際はline_idsとして扱う
      });
    },
    onSuccess: (data) => {
      toast.success(`SAP登録完了: ${data.registered_count}件`);
      // 関連キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["confirmed-order-lines"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
    },
    onError: () => {
      toast.error("SAP登録に失敗しました");
    },
  });

  return { registerToSAP, isRegistering };
}
