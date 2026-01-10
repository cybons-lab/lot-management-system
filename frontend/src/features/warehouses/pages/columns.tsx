/**
 * Warehouses Table Columns
 * 倉庫一覧テーブルのカラム定義
 */
import { Pencil, Trash2, RotateCcw } from "lucide-react";

import type { Warehouse } from "../api";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

const warehouseTypeLabels: Record<string, string> = {
  internal: "社内",
  external: "外部",
  supplier: "仕入先",
};

// Extend Warehouse type for valid_to check
type WarehouseWithValidTo = Warehouse & { valid_to?: string };

const isInactive = (validTo?: string | null) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0];
  return validTo <= today;
};

export interface WarehouseColumnsOptions {
  onEdit: (row: WarehouseWithValidTo) => void;
  onSoftDelete: (row: WarehouseWithValidTo) => void;
  onRestore: (row: WarehouseWithValidTo) => void;
  onPermanentDelete: (row: WarehouseWithValidTo) => void;
}

/**
 * 倉庫テーブルカラム定義を生成するファクトリ関数
 */
// eslint-disable-next-line max-lines-per-function -- カラム定義を1箇所にまとめて管理
export function createWarehouseColumns(
  options: WarehouseColumnsOptions,
): Column<WarehouseWithValidTo>[] {
  const { onEdit, onSoftDelete, onRestore, onPermanentDelete } = options;

  return [
    {
      id: "warehouse_code",
      header: "倉庫コード",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium whitespace-nowrap text-slate-900">
            {row.warehouse_code}
          </span>
          {isInactive(row.valid_to) && (
            <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              削除済
            </span>
          )}
        </div>
      ),
      sortable: true,
      width: "180px",
    },
    {
      id: "warehouse_name",
      header: "倉庫名",
      cell: (row) => (
        <span
          className={`whitespace-nowrap ${isInactive(row.valid_to) ? "text-muted-foreground" : "text-slate-900"}`}
        >
          {row.warehouse_name}
        </span>
      ),
      sortable: true,
      width: "250px",
    },
    {
      id: "warehouse_type",
      header: "タイプ",
      cell: (row) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-slate-800">
          {warehouseTypeLabels[row.warehouse_type] ?? row.warehouse_type}
        </span>
      ),
      sortable: true,
      width: "100px",
    },
    {
      id: "default_transport_lead_time_days",
      header: "輸送LT(日)",
      cell: (row) => (
        <span className="text-sm whitespace-nowrap text-slate-900">
          {row.default_transport_lead_time_days ?? "-"}
        </span>
      ),
      sortable: true,
      width: "100px",
      align: "right",
    },
    {
      id: "updated_at",
      header: "更新日時",
      cell: (row) => (
        <span className="text-sm whitespace-nowrap text-slate-500">
          {formatDate(row.updated_at)}
        </span>
      ),
      sortable: true,
      width: "150px",
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
  ];
}

/** 旧エクスポート（後方互換性） - 非推奨 */
export const warehouseColumns = createWarehouseColumns({
  onEdit: () => {},
  onSoftDelete: () => {},
  onRestore: () => {},
  onPermanentDelete: () => {},
});
