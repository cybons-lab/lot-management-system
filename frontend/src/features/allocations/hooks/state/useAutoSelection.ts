/**
 * Custom hook for automatic order and line selection
 */

import { useEffect, useRef } from "react";
import type { SetURLSearchParams } from "react-router-dom";

import type { Order, OrderCardData } from "../../types";

interface UseAutoSelectionParams {
  orderCards: OrderCardData[];
  selectedOrderId: number | null;
  orderDetailData: Order | undefined;
  selectedLineId: number | null;
  setSearchParams: SetURLSearchParams;
}

/**
 * 適切なフォールバック明細を取得する
 */
function getFallbackLine(lines: any[]): any | undefined {
  if (lines.length === 0) return undefined;

  // 有効な明細を選択: 製品コードがあり、数量が0より大きい明細を優先
  // DDL v2.2: prefer order_quantity, fallback to quantity
  return (
    lines.find((line) => {
      const hasProduct = line.supplier_item_id || line.product_code;
      const qty = Number(line.order_quantity ?? line.quantity ?? 0);
      return hasProduct && qty > 0;
    }) ??
    lines.find((line) => !!(line.supplier_item_id || line.product_code)) ??
    lines[0]
  );
}

export function useAutoSelection({
  orderCards,
  selectedOrderId,
  orderDetailData,
  selectedLineId,
  setSearchParams,
}: UseAutoSelectionParams) {
  // 初回マウント時のフラグ
  const isInitialMount = useRef(true);

  // 初回マウント時または受注一覧が変更されたときの自動選択
  useEffect(() => {
    // 初回マウント時のみ実行
    if (!isInitialMount.current) return;
    if (orderCards.length === 0) return;

    // 受注が選択されていない場合、または選択中の受注がリストに存在しない場合
    const existsInList = selectedOrderId
      ? orderCards.some((order) => order.id === selectedOrderId)
      : false;

    if (!selectedOrderId || !existsInList) {
      isInitialMount.current = false;
      setSearchParams({ selected: String(orderCards[0].id) });
      return;
    }

    isInitialMount.current = false;
  }, [orderCards, selectedOrderId, setSearchParams]);

  // 受注詳細が読み込まれたとき、有効な明細が選択されていない場合は最初の有効な明細を選択
  useEffect(() => {
    if (!orderDetailData) return;

    const lines = orderDetailData.lines ?? [];
    if (lines.length === 0) return;

    const normalizedSelectedLineId =
      selectedLineId != null && Number.isFinite(Number(selectedLineId))
        ? Number(selectedLineId)
        : null;

    // 現在選択中の明細が有効かチェック
    const hasSelected =
      normalizedSelectedLineId != null &&
      lines.some((line) => Number(line.id) === normalizedSelectedLineId);

    if (!hasSelected) {
      const fallbackLine = getFallbackLine(lines);
      if (!fallbackLine || fallbackLine.id == null) return;

      const fallbackId = Number(fallbackLine.id);
      if (!Number.isFinite(fallbackId)) return;

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("selected", String(orderDetailData.id));
        next.set("line", String(fallbackId));
        return next;
      });
    }
  }, [orderDetailData, selectedLineId, setSearchParams]);
}
