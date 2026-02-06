import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { getLots } from "@/features/inventory/api";
import { useLotActions } from "@/features/inventory/hooks/useLotActions";
import { normalizeLot, type LotUI } from "@/shared/libs/normalize";

const buildRowKey = (productId: number, warehouseId: number) => `${productId}-${warehouseId}`;

function parseRowKey(key: string): [number, number] | null {
  const [productId, warehouseId] = key.split("-").map(Number);
  if (Number.isNaN(productId) || Number.isNaN(warehouseId)) {
    return null;
  }
  return [productId, warehouseId];
}

function useExpandedRowsState() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((productId: number, warehouseId: number) => {
    const key = buildRowKey(productId, warehouseId);
    setExpandedRows((prev) => {
      if (prev.has(key)) {
        return new Set();
      }
      return new Set([key]);
    });
  }, []);

  const isRowExpanded = useCallback(
    (productId: number, warehouseId: number) =>
      expandedRows.has(buildRowKey(productId, warehouseId)),
    [expandedRows],
  );

  return { expandedRows, setExpandedRows, toggleRow, isRowExpanded };
}

function useLotsCacheState() {
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
      const key = buildRowKey(productId, warehouseId);

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

  const getLotsForItem = useCallback(
    (productId: number, warehouseId: number) =>
      lotsCache.get(buildRowKey(productId, warehouseId)) ?? [],
    [lotsCache],
  );

  const isLotsLoading = useCallback(
    (productId: number, warehouseId: number) =>
      loadingLots.has(buildRowKey(productId, warehouseId)),
    [loadingLots],
  );

  return {
    setLotsCache,
    fetchLotsForItem,
    getLotsForItem,
    isLotsLoading,
  };
}

/**
 * InventoryTable のビジネスロジックを管理するカスタムフック
 */
export function useInventoryTableLogic() {
  const navigate = useNavigate();
  const { expandedRows, setExpandedRows, toggleRow, isRowExpanded } = useExpandedRowsState();
  const { setLotsCache, fetchLotsForItem, getLotsForItem, isLotsLoading } = useLotsCacheState();

  const refetchLots = useCallback(() => {
    setLotsCache(new Map());

    expandedRows.forEach((key) => {
      const parsedKey = parseRowKey(key);
      if (!parsedKey) return;
      const [productId, warehouseId] = parsedKey;
      void fetchLotsForItem(productId, warehouseId, { force: true });
    });
  }, [expandedRows, fetchLotsForItem, setLotsCache]);

  const lotActions = useLotActions({ onLotsChanged: refetchLots });

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
