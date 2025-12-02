/**
 * ドラッグ引当用のカスタムフック
 * @description 新v2.2 API: POST /allocation-suggestions/manual を使用
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { http } from "@/shared/api/http-client";

// ドラッグ引当リクエストの型定義
// Note: allocated_quantity フィールド名に統一（allocate_qty は deprecated）
export interface DragAssignRequest {
  order_line_id: number;
  lot_id: number;
  allocated_quantity: number; // was: allocate_qty
}

// ドラッグ引当レスポンスの型定義
export interface DragAssignResponse {
  success?: boolean;
  message?: string;
  order_line_id: number;
  lot_id: number;
  lot_number: string;
  suggested_quantity: number;
  available_quantity: number;
  status: string;
}

/**
 * ドラッグ引当を実行（手動引当サジェスション）
 * @description 旧: POST /allocations/drag-assign → 新: POST /allocation-suggestions/manual
 */
export const useDragAssign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: DragAssignRequest) => {
      return http.post<DragAssignResponse>("allocation-suggestions/manual", request);
    },
    onSuccess: () => {
      // 引当成功時に関連データを再取得
      queryClient.invalidateQueries({ queryKey: ["order"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
    },
  });
};
