/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { getLots } from "@/features/inventory/api";
import { useLotActions } from "@/features/inventory/hooks/useLotActions";
import { normalizeLot, type LotUI } from "@/shared/libs/normalize";

/**
 * InventoryTable のビジネスロジックを管理するカスタムフック
 */
export function useInventoryTableLogic() {
  const navigate = useNavigate();

  // 展開状態管理（製品ID-倉庫IDのキー）
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [lotsCache, setLotsCache] = useState<Map<string, LotUI[]>>(new Map());
  const [loadingLots, setLoadingLots] = useState<Set<string>>(new Set());

  const fetchLotsForItem = useCallback(
    async (
      productId: number,
      warehouseId: number,
      options?: {
        force?: boolean;
      },
    ) => {
      const key = `${productId}-${warehouseId}`;

      if (!options?.force) {
        if (lotsCache.has(key)) return lotsCache.get(key) ?? [];
        if (loadingLots.has(key)) return [];
      }

      setLoadingLots((prev) => new Set(prev).add(key));

      try {
        const response = await getLots({
          supplier_item_id: productId,
          warehouse_id: warehouseId,
          with_stock: false,
          // Show all lot statuses (active, depleted, expired, locked)
        });

        const normalizedLots = (response ?? [])
          .map((item) =>
            normalizeLot(
              item as unknown as Record<string, unknown> & {
                lot_id: number;
                supplier_item_id: number;
                warehouse_id: number;
              },
            ),
          )
          .filter((lot) => lot.status !== "archived");

        setLotsCache((prev) => {
          const next = new Map(prev);
          next.set(key, normalizedLots);
          return next;
        });

        return normalizedLots;
      } finally {
        setLoadingLots((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [lotsCache, loadingLots],
  );

  const refetchLots = useCallback(() => {
    setLotsCache(new Map());

    expandedRows.forEach((key) => {
      const [productId, warehouseId] = key.split("-").map(Number);
      if (!Number.isNaN(productId) && !Number.isNaN(warehouseId)) {
        void fetchLotsForItem(productId, warehouseId, { force: true });
      }
    });
  }, [expandedRows, fetchLotsForItem]);

  // ロット操作ロジック（編集、ロック、ロック解除）
  const lotActions = useLotActions({ onLotsChanged: refetchLots });

  const toggleRow = useCallback((productId: number, warehouseId: number) => {
    const key = `${productId}-${warehouseId}`;
    setExpandedRows((prev) => {
      // If clicking on the already expanded row, close it
      if (prev.has(key)) {
        return new Set();
      }
      // Otherwise, close all others and open this one (single mode)
      return new Set([key]);
    });
  }, []);

  const isRowExpanded = useCallback(
    (productId: number, warehouseId: number) => {
      return expandedRows.has(`${productId}-${warehouseId}`);
    },
    [expandedRows],
  );

  const getLotsForItem = useCallback(
    (productId: number, warehouseId: number) => {
      return lotsCache.get(`${productId}-${warehouseId}`) ?? [];
    },
    [lotsCache],
  );

  const isLotsLoading = useCallback(
    (productId: number, warehouseId: number) => {
      return loadingLots.has(`${productId}-${warehouseId}`);
    },
    [loadingLots],
  );

  const handleViewDetail = useCallback(
    (productId: number, warehouseId: number) => {
      navigate(ROUTES.INVENTORY.ITEMS.DETAIL(productId, warehouseId));
    },
    [navigate],
  );

  return {
    ...lotActions,
    toggleRow,
    isRowExpanded,
    fetchLotsForItem,
    getLotsForItem,
    isLotsLoading,
    handleViewDetail,
    refetchLots,
    setExpandedRows,
  };
}
