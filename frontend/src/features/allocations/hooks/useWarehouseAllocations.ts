/**
 * Custom hook for managing warehouse allocation state
 * 倉庫ごとの在庫集計・配分管理（物理的な在庫所在の管理用）
 */

import { useEffect, useMemo, useRef, useState } from "react";

import type { WarehouseSummary } from "../types";

import type { AllocationInputItem } from "@/features/allocations/api";
import type { Lot as CandidateLot } from "@/hooks/useLotsQuery";

export function useWarehouseAllocations(
  candidateLots: CandidateLot[],
  selectedLineId: number | null,
) {
  const [warehouseAllocations, setWarehouseAllocations] = useState<Record<string, number>>({});
  const lastSelectedLineIdRef = useRef<number | null>(null);

  // 倉庫サマリーの計算（warehouse_idで集計）
  const warehouseSummaries: WarehouseSummary[] = useMemo(() => {
    const map = new Map<string, WarehouseSummary>();
    candidateLots.forEach((lot) => {
      // warehouse_idをキーとして使用（在庫所在の物理的な管理）
      const key = String(lot.warehouse_id ?? lot.id);
      const existing = map.get(key) ?? {
        key,
        warehouseId: lot.warehouse_id ?? undefined,
        warehouseCode: null, // warehouse_codeは廃止
        warehouseName: lot.warehouse_name ?? null,
        totalStock: 0,
      };

      existing.totalStock += lot.current_stock?.current_quantity ?? 0;
      map.set(key, existing);
    });

    return Array.from(map.values());
  }, [candidateLots]);

  // 倉庫配分の初期化(明細が変わったときのみリセット)
  useEffect(() => {
    // 明細が変わったかチェック
    const lineChanged = lastSelectedLineIdRef.current !== (selectedLineId ?? null);

    if (warehouseSummaries.length === 0) {
      if (lineChanged) {
        setWarehouseAllocations({});
        lastSelectedLineIdRef.current = selectedLineId ?? null;
      }
      return;
    }

    // 倉庫のキー一覧を取得
    const newKeys = warehouseSummaries.map((w) => w.key).sort();

    setWarehouseAllocations((prev) => {
      const prevKeys = Object.keys(prev).sort();

      // キーが同じで、明細も変わっていない場合は更新しない（無限ループ防止）
      const keysMatch =
        newKeys.length === prevKeys.length && newKeys.every((key, i) => key === prevKeys[i]);
      if (!lineChanged && keysMatch) {
        return prev;
      }

      // 新しい配分オブジェクトを作成
      const next: Record<string, number> = {};
      warehouseSummaries.forEach((warehouse) => {
        next[warehouse.key] = lineChanged ? 0 : (prev[warehouse.key] ?? 0);
      });
      return next;
    });

    if (lineChanged) {
      lastSelectedLineIdRef.current = selectedLineId ?? null;
    }
  }, [selectedLineId, warehouseSummaries]);

  // 配分リスト(保存用)
  const allocationList: AllocationInputItem[] = useMemo(() => {
    return warehouseSummaries
      .map((warehouse) => ({
        lotId: 0, // TODO: ロット選択機能実装時に適切なlot_idを設定
        lot: null, // TODO: ロット選択機能実装時に適切なlotオブジェクトを設定
        warehouse_id: warehouse.warehouseId ?? null,
        warehouse_code: null, // warehouse_codeは廃止
        quantity: Number(warehouseAllocations[warehouse.key] ?? 0),
      }))
      .filter((item) => item.quantity > 0);
  }, [warehouseSummaries, warehouseAllocations]);

  // 配分合計
  const allocationTotalAll = useMemo(() => {
    return warehouseSummaries.reduce(
      (sum, warehouse) => sum + Number(warehouseAllocations[warehouse.key] ?? 0),
      0,
    );
  }, [warehouseSummaries, warehouseAllocations]);

  return {
    warehouseAllocations,
    setWarehouseAllocations,
    warehouseSummaries,
    allocationList,
    allocationTotalAll,
  };
}
