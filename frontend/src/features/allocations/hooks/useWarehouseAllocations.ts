/**
 * 倉庫別配分（= 今は delivery_place 単位）の管理フック
 * - サマリ集計キー: delivery_place_code -> delivery_place_id -> lot.id
 * - 数値化は toQty に統一
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { toQty } from "../utils/qty";
import type { WarehouseSummary } from "../types";
import type { AllocationInputItem } from "@/features/allocations/api";
import type { Lot as CandidateLot } from "@/hooks/useLotsQuery";

export function useWarehouseAllocations(
  candidateLots: CandidateLot[] = [],
  selectedLineId: number | null,
) {
  const [warehouseAllocations, setWarehouseAllocations] = useState<Record<string, number>>({});

  // 前回の「選択行」と「倉庫サマリのシグネチャ」を保持
  const lastSelectedLineKeyRef = useRef<string | null>(null);
  const lastSummarySignatureRef = useRef<string | null>(null);

  // delivery_place 単位でサマリ集計
  const warehouseSummaries: WarehouseSummary[] = useMemo(() => {
    const map = new Map<string, WarehouseSummary>();
    for (const lot of candidateLots ?? []) {
      const key = String(lot.delivery_place_code ?? (lot as any).delivery_place_id ?? lot.id);
      const existing =
        map.get(key) ??
        ({
          key,
          warehouseId: (lot as any).delivery_place_id ?? undefined,
          warehouseCode: lot.delivery_place_code ?? null,
          warehouseName: lot.delivery_place_name ?? lot.warehouse_name ?? null,
          totalStock: 0,
        } as WarehouseSummary);

      existing.totalStock += toQty(lot.free_qty ?? lot.current_quantity);
      map.set(key, existing);
    }
    return Array.from(map.values());
  }, [candidateLots]);

  // 「倉庫サマリが実質同じかどうか」を判定するシグネチャ
  const warehouseSummarySignature = useMemo(
    () =>
      warehouseSummaries
        .map((w) => `${w.key}:${w.totalStock}`)
        .sort()
        .join("|"),
    [warehouseSummaries],
  );

  // 明細切替時 または 倉庫サマリが変わったときにだけ配分を調整
  useEffect(() => {
    const currentLineKey = selectedLineId != null ? String(selectedLineId) : null;

    const lineChanged = lastSelectedLineKeyRef.current !== currentLineKey;
    const summaryChanged = lastSummarySignatureRef.current !== warehouseSummarySignature;

    // 行もサマリも変わっていない → 何もしない（＝無限ループ防止）
    if (!lineChanged && !summaryChanged) {
      return;
    }

    setWarehouseAllocations((prev) => {
      const next: Record<string, number> = {};
      for (const w of warehouseSummaries) {
        next[w.key] = lineChanged ? 0 : (prev[w.key] ?? 0);
      }
      return next;
    });

    if (lineChanged) {
      lastSelectedLineKeyRef.current = currentLineKey;
    }
    if (summaryChanged) {
      lastSummarySignatureRef.current = warehouseSummarySignature;
    }
  }, [selectedLineId, warehouseSummarySignature, warehouseSummaries]);

  // 保存用の配分リスト
  const allocationList: AllocationInputItem[] = useMemo(() => {
    return warehouseSummaries
      .map((w) => ({
        lotId: 0, // TODO: ロット選択実装時に差し替え
        lot: null,
        delivery_place_id: w.warehouseId ?? null,
        delivery_place_code: w.warehouseCode,
        quantity: Number(warehouseAllocations[w.key] ?? 0),
      }))
      .filter((x) => x.quantity > 0);
  }, [warehouseSummaries, warehouseAllocations]);

  // 合計
  const allocationTotalAll = useMemo(() => {
    return Object.values(warehouseAllocations).reduce(
      (a, b) => a + (Number.isFinite(b) ? Number(b) : 0),
      0,
    );
  }, [warehouseAllocations]);

  return {
    warehouseAllocations,
    setWarehouseAllocations,
    warehouseSummaries,
    allocationList,
    allocationTotalAll,
  };
}
