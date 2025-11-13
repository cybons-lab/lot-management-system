/**
 * Custom hook for automatic order and line selection
 */

import { useEffect, useRef } from "react";
import type { SetURLSearchParams } from "react-router-dom";

import type { Order, OrderCardData } from "../types";

export function useAutoSelection(
  orderCards: OrderCardData[],
  selectedOrderId: number | null,
  orderDetailData: Order | undefined,
  selectedLineId: number | null,
  setSearchParams: SetURLSearchParams,
) {
  // 初回マウント時のフラグ
  const isInitialMount = useRef(true);

  // 初回マウント時または受注一覧が変更されたときの自動選択
  useEffect(() => {
    // 初回マウント時のみ実行
    if (!isInitialMount.current) return;
    if (orderCards.length === 0) return;

    // 受注が選択されていない場合、最初の受注を選択
    if (!selectedOrderId) {
      isInitialMount.current = false;
      setSearchParams({ selected: String(orderCards[0].id) });
      return;
    }

    // 選択中の受注がリストに存在するかチェック
    const existsInList = orderCards.some((order) => order.id === selectedOrderId);
    if (!existsInList) {
      isInitialMount.current = false;
      setSearchParams({ selected: String(orderCards[0].id) });
    } else {
      isInitialMount.current = false;
    }
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
      // 有効な明細を選択: 製品コードがあり、数量が0より大きい明細を優先
      const fallbackLine =
        lines.find((line) => line.product_code && line.quantity > 0) ??
        lines.find((line) => !!line.product_code) ??
        lines[0];

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
