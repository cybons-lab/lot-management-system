/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import { useMemo } from "react";

import type { SupplierProduct } from "../api";

import { Button } from "@/components/ui";
import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";

export type SupplierProductWithValidTo = SupplierProduct & { valid_to?: string };

interface SupplierProductsTableProps {
  suppliers: { id: number; supplier_code: string; supplier_name: string }[];
  supplierProducts: SupplierProduct[];
  isLoading: boolean;
  sort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  onEdit: (row: SupplierProductWithValidTo) => void;
  onSoftDelete: (row: SupplierProductWithValidTo) => void;
  onPermanentDelete: (row: SupplierProductWithValidTo) => void;
  onRestore: (row: SupplierProductWithValidTo) => void;
}

const isInactive = (validTo?: string | null) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0];
  return validTo <= today;
};

export function SupplierProductsTable({
  suppliers,
  supplierProducts,
  isLoading,
  sort,
  onSortChange,
  onEdit,
  onSoftDelete,
  onPermanentDelete,
  onRestore,
}: SupplierProductsTableProps) {
  // Map for efficient lookups
  const supplierMap = useMemo(() => {
    return new Map(suppliers.map((s) => [s.id, { code: s.supplier_code, name: s.supplier_name }]));
  }, [suppliers]);

  const columns = useMemo<Column<SupplierProductWithValidTo>[]>(
    () => [
      {
        id: "supplier_id",
        header: "仕入先",
        cell: (row) => {
          let content;
          if (row.supplier_code && row.supplier_name) {
            content = `${row.supplier_code} - ${row.supplier_name}`;
          } else {
            const s = supplierMap.get(row.supplier_id);
            content = s ? `${s.code} - ${s.name}` : `ID: ${row.supplier_id}`;
          }
          return (
            <div>
              <span>{content}</span>
              {isInactive(row.valid_to) && (
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  削除済
                </span>
              )}
            </div>
          );
        },
        sortable: true,
      },
      {
        id: "maker_part_no",
        header: "メーカー品番",
        cell: (row) => <span className="font-mono text-slate-700">{row.maker_part_no}</span>,
        sortable: true,
      },
      {
        id: "display_name",
        header: "製品名",
        cell: (row) => row.display_name || "-",
        sortable: true,
      },
      {
        id: "base_unit",
        header: "基本単位",
        cell: (row) => row.base_unit || "-",
        sortable: true,
      },
      {
        id: "lead_time_days",
        header: "ＬＴ(日)",
        cell: (row) => (row.lead_time_days != null ? `${row.lead_time_days}日` : "-"),
        sortable: true,
      },
      {
        id: "actions",
        header: "操作",
        cell: (row) => {
          const inactive = isInactive(row.valid_to);
          if (inactive) {
            return (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(row);
                  }}
                  title="復元"
                >
                  <RotateCcw className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPermanentDelete(row);
                  }}
                  title="完全に削除"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            );
          }
          return (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label="編集"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSoftDelete(row);
                }}
              >
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [supplierMap, onEdit, onSoftDelete, onPermanentDelete, onRestore],
  );

  return (
    <DataTable
      data={supplierProducts as SupplierProductWithValidTo[]}
      columns={columns}
      sort={sort}
      onSortChange={onSortChange}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      emptyMessage="仕入先商品が登録されていません"
    />
  );
}
