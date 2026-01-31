import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useMySuppliers } from "@/features/assignments/hooks/useMySuppliers";
import type { OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import { useOrderLines } from "@/features/orders/hooks/useOrderLines";
import { useCreateOrder } from "@/hooks/mutations";
import { useDialog, useFilters, useTable } from "@/hooks/ui";
import { useConfirmedOrderLines } from "@/hooks/useConfirmedOrderLines";
import { formatOrderCode } from "@/shared/utils/order";
import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

type ViewMode = "delivery" | "flat" | "order";

/**
 * 検索フィルター適用
 */
// eslint-disable-next-line complexity
function applySearchFilter(line: OrderLineRow, searchTerm: string): boolean {
  const searchLower = searchTerm.toLowerCase();
  const orderCode = formatOrderCode(line);
  const matchOrderNo = orderCode.toLowerCase().includes(searchLower);
  const matchCustomer =
    (line.customer_name || "").toLowerCase().includes(searchLower) ||
    (line.customer_code || "").toLowerCase().includes(searchLower);
  const matchDeliveryPlace =
    (line.delivery_place_name || "").toLowerCase().includes(searchLower) ||
    (line.delivery_place_code || "").toLowerCase().includes(searchLower) ||
    (line.delivery_place || "").toLowerCase().includes(searchLower);
  const matchReferenceNo =
    (line.customer_order_no || "").toLowerCase().includes(searchLower) ||
    (line.sap_order_no || "").toLowerCase().includes(searchLower);
  const matchProduct =
    (line.product_name || "").toLowerCase().includes(searchLower) ||
    (line.product_code || "").toLowerCase().includes(searchLower);

  return matchOrderNo || matchCustomer || matchDeliveryPlace || matchReferenceNo || matchProduct;
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
 * 担当仕入先フィルター適用
 */
function applyPrimarySuppliersFilter(
  line: OrderLineRow,
  primarySupplierIds: number[] | undefined,
): boolean {
  if (!primarySupplierIds) return true;
  const supplierId = line.supplier_id as number | undefined;
  return !!supplierId && primarySupplierIds.includes(supplierId);
}

/**
 * 無効な得意先フィルター適用
 */
function applyInactiveCustomersFilter(line: OrderLineRow, showInactiveCustomers: boolean): boolean {
  if (showInactiveCustomers || !line.customer_valid_to) return true;
  const todayStr = new Date().toISOString().split("T")[0];
  return line.customer_valid_to >= todayStr;
}

/**
 * OrdersListPage のビジネスロジックを管理するカスタムフック
 */
// eslint-disable-next-line max-lines-per-function -- 論理的なまとまりを優先し、フィルタ・テーブル・ダイアログロジックを1つのフックで管理
export function useOrdersListLogic() {
  const createDialog = useDialog();

  // 担当仕入先を取得
  const { data: mySuppliers } = useMySuppliers();
  const hasAssignedSuppliers = (mySuppliers?.primary_supplier_ids?.length ?? 0) > 0;

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
    primarySuppliersOnly: hasAssignedSuppliers, // 担当仕入先がある場合、自動的にON
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
    onError: async (error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`受注の作成に失敗しました: ${message}`);
    },
  });

  const filteredLines = useMemo(() => {
    return allOrderLines.filter((line: OrderLineRow) => {
      // 検索フィルタ
      if (filters.values.search && !applySearchFilter(line, filters.values.search as string)) {
        return false;
      }
      // 未引当フィルタ
      if (filters.values.unallocatedOnly && !applyUnallocatedFilter(line)) {
        return false;
      }
      // 担当仕入先フィルタ
      if (
        filters.values.primarySuppliersOnly &&
        !applyPrimarySuppliersFilter(line, mySuppliers?.primary_supplier_ids)
      ) {
        return false;
      }
      // 無効な得意先フィルタ
      if (!applyInactiveCustomersFilter(line, !!filters.values.showInactiveCustomers)) {
        return false;
      }
      return true;
    });
  }, [
    allOrderLines,
    filters.values.search,
    filters.values.unallocatedOnly,
    filters.values.primarySuppliersOnly,
    filters.values.showInactiveCustomers,
    mySuppliers,
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
    hasAssignedSuppliers,
  };
}
