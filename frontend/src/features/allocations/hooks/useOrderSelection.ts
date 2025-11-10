/**
 * Custom hook for managing order and line selection state via URL params
 */

import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useOrderSelection() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedOrderId = searchParams.get("selected")
    ? Number(searchParams.get("selected"))
    : null;
  const selectedLineId = searchParams.get("line") ? Number(searchParams.get("line")) : null;

  // 受注一覧から受注を選択したときのハンドラー
  const handleSelectOrder = useCallback(
    (orderId: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("selected", String(orderId));
        next.delete("line"); // 明細選択をクリア
        return next;
      });
    },
    [setSearchParams],
  );

  // 明細一覧から明細を選択したときのハンドラー
  const handleSelectLine = useCallback(
    (lineId: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (selectedOrderId) {
          next.set("selected", String(selectedOrderId));
        }
        next.set("line", String(lineId));
        return next;
      });
    },
    [setSearchParams, selectedOrderId],
  );

  return {
    selectedOrderId,
    selectedLineId,
    setSearchParams,
    handleSelectOrder,
    handleSelectLine,
  };
}
