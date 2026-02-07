/**
 * Warehouses Table Columns
 * 倉庫一覧テーブルのカラム定義
 */
import { Pencil, Trash2, RotateCcw } from "lucide-react";

import type { Warehouse } from "../api";

import { Button } from "@/components/ui";
import { type Column } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

const typeLabels: Record<string, string> = {
  internal: "社内",
  external: "外部",
  supplier: "仕入先",
};
export type WarehouseWithValidTo = Warehouse & { valid_to?: string };

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

const renderCode = (row: WarehouseWithValidTo) => (
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
);

const renderActions = (row: WarehouseWithValidTo, o: WarehouseColumnsOptions) => {
  const inactive = isInactive(row.valid_to);
  if (inactive) {
    return (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            o.onRestore(row);
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
            o.onPermanentDelete(row);
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
          o.onEdit(row);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          o.onSoftDelete(row);
        }}
      >
        <Trash2 className="text-destructive h-4 w-4" />
      </Button>
    </div>
  );
};

export function createWarehouseColumns(o: WarehouseColumnsOptions): Column<WarehouseWithValidTo>[] {
  return [
    {
      id: "warehouse_code",
      header: "倉庫コード",
      cell: renderCode,
      sortable: true,
      width: "180px",
    },
    {
      id: "warehouse_name",
      header: "倉庫名",
      cell: (r) => (
        <span
          className={`whitespace-nowrap ${isInactive(r.valid_to) ? "text-muted-foreground" : "text-slate-900"}`}
        >
          {r.warehouse_name}
        </span>
      ),
      sortable: true,
      width: "250px",
    },
    {
      id: "warehouse_type",
      header: "タイプ",
      cell: (r) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-slate-800">
          {typeLabels[r.warehouse_type] ?? r.warehouse_type}
        </span>
      ),
      sortable: true,
      width: "100px",
    },
    {
      id: "default_transport_lead_time_days",
      header: "輸送LT(日)",
      cell: (r) => (
        <span className="text-sm whitespace-nowrap text-slate-900">
          {r.default_transport_lead_time_days ?? "-"}
        </span>
      ),
      sortable: true,
      width: "100px",
      align: "right",
    },
    {
      id: "updated_at",
      header: "更新日時",
      cell: (r) => (
        <span className="text-sm whitespace-nowrap text-slate-500">{formatDate(r.updated_at)}</span>
      ),
      sortable: true,
      width: "150px",
    },
    { id: "actions", header: "操作", cell: (r) => renderActions(r, o) },
  ];
}
