import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import { useOrderLines } from "@/features/orders/hooks/useOrderLines";
import { useCreateOrder } from "@/hooks/mutations";
import { useDialog, useFilters, useTable } from "@/hooks/ui";
import { useConfirmedOrderLines } from "@/hooks/useConfirmedOrderLines";
import { formatOrderCode } from "@/shared/utils/order";

type ViewMode = "delivery" | "flat" | "order";

/**
 * 検索フィルター適用
 */
function applySearchFilter(line: OrderLineRow, searchTerm: string): boolean {
  const searchLower = searchTerm.toLowerCase();
  const orderCode = formatOrderCode(line);
  const matchOrderNo = orderCode.toLowerCase().includes(searchLower);
  const matchCustomer =
    (line.customer_name || "").toLowerCase().includes(searchLower) ||
    (line.customer_code || "").toLowerCase().includes(searchLower);
  const matchProduct =
    (line.product_name || "").toLowerCase().includes(searchLower) ||
    (line.product_code || "").toLowerCase().includes(searchLower);

  return matchOrderNo || matchCustomer || matchProduct;
}

/**
 * 未引当フィルター適用
 */
function applyUnallocatedFilter(line: OrderLineRow): boolean {
  const orderQty = Number(line.order_quantity ?? line.quantity ?? 0);
  const reservations = Array.isArray(line.reservations)
    ? line.reservations
    : Array.isArray(line.allocated_lots)
      ? line.allocated_lots
      : [];
  const allocatedQty = reservations.reduce((acc: number, alloc: unknown) => {
    const item = alloc as {
      reserved_qty?: number | string;
      allocated_quantity?: number | string;
      allocated_qty?: number | string;
    };
    return acc + Number(item.reserved_qty ?? item.allocated_quantity ?? item.allocated_qty ?? 0);
  }, 0);
  return orderQty > 0 && allocatedQty < orderQty;
}

/**
 * OrdersListPage のビジネスロジックを管理するカスタムフック
 */
export function useOrdersListLogic() {
  const createDialog = useDialog();

  const table = useTable({
    initialPageSize: 25,
    initialSort: { column: "due_date", direction: "asc" },
  });

  const filters = useFilters({
    search: "",
    customer_code: "",
    status: "all",
    order_type: "all",
    unallocatedOnly: false,
    primarySuppliersOnly: false,
    showInactiveCustomers: false,
  });

  const [viewMode, setViewMode] = useState<ViewMode>("flat");

  const {
    data: allOrderLines = [],
    isLoading,
    error,
    refetch,
  } = useOrderLines({
    customer_code: filters.values.customer_code || undefined,
    status: filters.values.status !== "all" ? filters.values.status : undefined,
    order_type: filters.values.order_type !== "all" ? filters.values.order_type : undefined,
  });

  const { data: confirmedLines = [] } = useConfirmedOrderLines();

  const createOrderMutation = useCreateOrder({
    onSuccess: () => {
      toast.success("受注を作成しました");
      createDialog.close();
      refetch();
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  const filteredLines = useMemo(() => {
    return allOrderLines.filter((line: OrderLineRow) => {
      if (filters.values.search && !applySearchFilter(line, filters.values.search as string)) {
        return false;
      }
      if (filters.values.unallocatedOnly && !applyUnallocatedFilter(line)) {
        return false;
      }

      // Filter inactive customers
      if (!filters.values.showInactiveCustomers && line.customer_valid_to) {
        const todayStr = new Date().toISOString().split("T")[0];
        if (line.customer_valid_to < todayStr) {
          return false;
        }
      }

      return true;
    });
  }, [
    allOrderLines,
    filters.values.search,
    filters.values.unallocatedOnly,
    filters.values.showInactiveCustomers,
  ]);

  const sortedLines = table.sortData(filteredLines);
  const paginatedLines = table.paginateData(sortedLines);

  return {
    allOrderLines,
    confirmedLines,
    filteredLines,
    sortedLines,
    paginatedLines,
    filters,
    table,
    viewMode,
    setViewMode,
    isLoading,
    error,
    refetch,
    createDialog,
    createOrderMutation,
  };
}
