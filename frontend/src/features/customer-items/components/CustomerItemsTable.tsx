/**
 * CustomerItemsTable - Table component for customer items.
 * Refactored to use DataTable component.
 * Simplified version - OCR/SAP fields removed
 */
import { Building2, Package, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { CustomerItem } from "../api";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

interface CustomerItemsTableProps {
  items: CustomerItem[];
  isLoading: boolean;
  onEdit: (item: CustomerItem) => void;
  onSoftDelete: (item: CustomerItem) => void;
  onPermanentDelete: (item: CustomerItem) => void;
  onRestore: (item: CustomerItem) => void;
  onRowClick?: (item: CustomerItem) => void;
  // 選択機能（オプション）
  selectedIds?: Set<string | number>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  // 管理者なら全アイテム選択可能
  isAdmin?: boolean;
}

const isInactive = (validTo?: string) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0];
  return validTo <= today;
};

/** CustomerItem用の一意キー生成 (サロゲートキーID使用) */
const getItemKey = (item: CustomerItem) => item.id.toString();

// eslint-disable-next-line max-lines-per-function
export function CustomerItemsTable({
  items,
  isLoading,
  onEdit,
  onSoftDelete,
  onPermanentDelete,
  onRestore,
  onRowClick,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isAdmin = false,
}: CustomerItemsTableProps) {
  // 列定義
  const columns = useMemo<Column<CustomerItem>[]>(
    // eslint-disable-next-line max-lines-per-function
    () => [
      {
        id: "customer",
        header: "得意先",
        accessor: (row) => row.customer_name,
        cell: (row) => {
          const inactive = isInactive(row.valid_to);
          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-orange-600" />
              <div className="min-w-[120px]">
                <div className="font-medium truncate" title={row.customer_name}>
                  {row.customer_name}
                </div>
                <div className="text-xs text-gray-500">{row.customer_code}</div>
                {inactive && (
                  <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    削除済
                  </span>
                )}
              </div>
            </div>
          );
        },
        width: 180,
        sortable: true,
      },
      {
        id: "customer_part_no",
        header: "得意先品番",
        accessor: (row) => row.customer_part_no,
        cell: (row) => (
          <span className="font-medium whitespace-nowrap">{row.customer_part_no}</span>
        ),
        width: 150,
        sortable: true,
      },
      {
        id: "product",
        header: "商品",
        accessor: (row) => row.product_name,
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 shrink-0 text-green-600" />
            <div className="min-w-[120px]">
              <div className="truncate font-medium text-sm" title={row.product_name}>
                {row.product_name}
              </div>
              <div className="text-xs text-gray-500">{row.product_code}</div>
            </div>
          </div>
        ),
        width: 180,
        sortable: true,
      },
      {
        id: "supplier",
        header: "仕入先",
        accessor: (row) => row.supplier_name || "",
        cell: (row) =>
          row.supplier_name ? (
            <div className="min-w-[100px]">
              <div className="font-medium">{row.supplier_code}</div>
              <div className="truncate text-xs text-gray-500" title={row.supplier_name}>
                {row.supplier_name}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          ),
        width: 140,
        sortable: true,
      },
      {
        id: "base_unit",
        header: "基本単位",
        accessor: (row) => row.base_unit,
        width: 100,
        sortable: true,
      },
      {
        id: "pack",
        header: "包装",
        accessor: (row) =>
          row.pack_unit && row.pack_quantity ? `${row.pack_unit}/${row.pack_quantity}` : "-",
        cell: (row) =>
          row.pack_unit && row.pack_quantity ? (
            <span>
              {row.pack_unit} / {row.pack_quantity}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          ),
        width: 100,
      },
      {
        id: "special_instructions",
        header: "特記事項",
        accessor: (row) => row.special_instructions || "",
        cell: (row) =>
          row.special_instructions ? (
            <div className="max-w-[150px] truncate" title={row.special_instructions}>
              {row.special_instructions}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          ),
        width: 150,
      },
    ],
    [],
  );

  // アクションボタン
  const renderRowActions = (item: CustomerItem) => {
    const inactive = isInactive(item.valid_to);

    if (inactive) {
      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRestore(item);
            }}
            title="復元"
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPermanentDelete(item);
            }}
            title="完全に削除"
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          title="編集"
          className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onSoftDelete(item);
          }}
          title="削除"
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // 行クラス名（削除済み行を薄くする）
  const getRowClassName = (item: CustomerItem) => {
    const inactive = isInactive(item.valid_to);
    return inactive ? "opacity-60" : "";
  };

  // 選択状態変更ハンドラー
  // eslint-disable-next-line complexity
  const handleSelectionChange = (ids: (string | number)[]) => {
    if (!onToggleSelect || !onToggleSelectAll) return;

    // 選択可能なアイテムのキー
    const selectableItems = isAdmin ? items : items.filter((item) => !isInactive(item.valid_to));
    const selectableKeys = selectableItems.map(getItemKey);

    // 全選択解除の場合
    if (ids.length === 0 && selectedIds && selectedIds.size > 0) {
      onToggleSelectAll();
      return;
    }

    // 全選択の場合
    if (
      ids.length === selectableKeys.length &&
      selectedIds &&
      selectedIds.size < selectableKeys.length
    ) {
      onToggleSelectAll();
      return;
    }

    // 個別トグルの場合（差分を見つける）
    const idsSet = new Set(ids.map(String));
    const currentSet = selectedIds ? new Set([...selectedIds].map(String)) : new Set<string>();

    const added = [...idsSet].find((id) => !currentSet.has(id));
    const removed = [...currentSet].find((id) => !idsSet.has(id));

    if (added !== undefined) {
      onToggleSelect(added);
    } else if (removed !== undefined) {
      onToggleSelect(removed);
    }
  };

  // 選択可能かどうかを判定
  const selectedIdsArray = selectedIds ? Array.from(selectedIds) : undefined;

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold">マッピング一覧</h3>
        <p className="text-sm text-gray-600">{items.length} 件のマッピング</p>
      </div>

      <DataTable
        data={items}
        columns={columns}
        selectable={!!selectedIds && !!onToggleSelect}
        selectedIds={selectedIdsArray}
        onSelectionChange={handleSelectionChange}
        getRowId={getItemKey}
        onRowClick={onRowClick}
        rowActions={renderRowActions}
        getRowClassName={getRowClassName}
        isLoading={isLoading}
        emptyMessage="得意先品番マッピングが登録されていません"
      />
    </div>
  );
}
