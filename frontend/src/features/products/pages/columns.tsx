/**
 * Products Table Columns
 * 商品一覧テーブルのカラム定義
 */
import { Pencil, Trash2, RotateCcw } from "lucide-react";

import type { Product } from "../api";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

// Extend Product type for valid_to check
type ProductWithValidTo = Product & { valid_to?: string };

const isInactive = (validTo?: string | null) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0];
  return validTo <= today;
};

export interface ProductColumnsOptions {
  onEdit: (row: ProductWithValidTo) => void;
  onSoftDelete: (row: ProductWithValidTo) => void;
  onRestore: (row: ProductWithValidTo) => void;
  onPermanentDelete: (row: ProductWithValidTo) => void;
}

/**
 * 商品テーブルカラム定義を生成するファクトリ関数
 */
// eslint-disable-next-line max-lines-per-function -- カラム定義を1箇所にまとめて管理
export function createProductColumns(options: ProductColumnsOptions): Column<ProductWithValidTo>[] {
  const { onEdit, onSoftDelete, onRestore, onPermanentDelete } = options;

  return [
    {
      id: "product_code",
      header: "商品コード",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium whitespace-nowrap text-slate-900">
            {row.product_code}
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
      id: "product_name",
      header: "商品名",
      cell: (row) => (
        <span
          className={`whitespace-nowrap ${isInactive(row.valid_to) ? "text-muted-foreground" : "text-slate-900"}`}
        >
          {row.product_name}
        </span>
      ),
      sortable: true,
      width: "200px",
    },
    {
      id: "maker_part_code",
      header: "メーカー品番",
      cell: (row) => (
        <span className="font-mono text-sm whitespace-nowrap text-slate-700">
          {row.maker_part_code || "-"}
        </span>
      ),
      sortable: true,
      width: "140px",
    },
    {
      id: "base_unit",
      header: "基本単位",
      cell: (row) => (
        <span className="text-sm whitespace-nowrap text-slate-700">{row.base_unit || "-"}</span>
      ),
      sortable: true,
      width: "90px",
    },
    {
      id: "consumption_limit_days",
      header: "消費期限(日)",
      cell: (row) => (
        <span className="text-sm whitespace-nowrap text-slate-700">
          {row.consumption_limit_days != null ? row.consumption_limit_days : "-"}
        </span>
      ),
      sortable: true,
      width: "100px",
      align: "right",
    },
    {
      id: "internal_unit",
      header: "社内単位",
      cell: (row) => (
        <span className="text-sm whitespace-nowrap text-slate-700">{row.internal_unit}</span>
      ),
      sortable: true,
      width: "90px",
    },
    {
      id: "external_unit",
      header: "外部単位",
      cell: (row) => (
        <span className="text-sm whitespace-nowrap text-slate-700">{row.external_unit}</span>
      ),
      sortable: true,
      width: "90px",
    },
    {
      id: "qty_per_internal_unit",
      header: "単位当たり数量",
      cell: (row) => (
        <span className="text-sm whitespace-nowrap text-slate-700">
          {row.qty_per_internal_unit}
        </span>
      ),
      sortable: true,
      width: "120px",
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
      width: "120px",
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
export const productColumns = createProductColumns({
  onEdit: () => {},
  onSoftDelete: () => {},
  onRestore: () => {},
  onPermanentDelete: () => {},
});
