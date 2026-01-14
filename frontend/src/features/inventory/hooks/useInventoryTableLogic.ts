import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useLotActions } from "@/features/inventory/hooks/useLotActions";

/**
 * InventoryTable のビジネスロジックを管理するカスタムフック
 */
export function useInventoryTableLogic() {
  const navigate = useNavigate();

  // ロット操作ロジック（編集、ロック、ロック解除）
  const lotActions = useLotActions();

  // 展開状態管理（製品ID-倉庫IDのキー）
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((productId: number, warehouseId: number) => {
    const key = `${productId}-${warehouseId}`;
    setExpandedRows((prev) => {
      const newExpanded = new Set<string>();
      if (!prev.has(key)) {
        newExpanded.add(key);
      }
      return newExpanded;
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
      return lotActions.allLots.filter(
        (lot) => lot.product_id === productId && lot.warehouse_id === warehouseId,
      );
    },
    [lotActions.allLots],
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
    getLotsForItem,
    handleViewDetail,
  };
}
