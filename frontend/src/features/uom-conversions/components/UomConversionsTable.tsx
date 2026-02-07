/**
 * UomConversionsTable - Table component for UOM conversions.
 * Refactored to use DataTable component.
 */
import { Check, Package, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useMemo } from "react";

import type { UomConversionResponse } from "../api";

import { Button, Input } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

const isInactive = (validTo?: string) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0] ?? "";
  return validTo <= today;
};

/** Props for UomConversionsTable */
interface TableProps {
  conversions: UomConversionResponse[];
  editingId: number | null;
  editValue: string;
  setEditValue: (v: string) => void;
  isUpdating: boolean;
  handleSaveEdit: (conversion: UomConversionResponse) => void;
  handleCancelEdit: () => void;
  handleStartEdit: (c: UomConversionResponse) => void;
  handleSoftDelete: (c: UomConversionResponse) => void;
  handlePermanentDelete: (c: UomConversionResponse) => void;
  handleRestore: (c: UomConversionResponse) => void;
  isLoading?: boolean;
}

/** UOM conversions table component */
// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
export function UomConversionsTable({
  conversions,
  editingId,
  editValue,
  setEditValue,
  isUpdating,
  handleSaveEdit,
  handleCancelEdit,
  handleStartEdit,
  handleSoftDelete,
  handlePermanentDelete,
  handleRestore,
  isLoading = false,
}: TableProps) {
  // 列定義
  const columns = useMemo<Column<UomConversionResponse>[]>(
    // eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
    () => [
      {
        id: "product_code",
        header: "先方品番",
        accessor: (row) => row.product_code,
        cell: (row) => {
          const inactive = isInactive(row.valid_to);
          return (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <span className="whitespace-nowrap">{row.product_code}</span>
              {inactive && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  削除済
                </span>
              )}
            </div>
          );
        },
        width: 150,
        sortable: true,
      },
      {
        id: "product_name",
        header: "商品名",
        accessor: (row) => row.product_name ?? "",
        cell: (row) => (
          <span className="block max-w-[200px] truncate" title={row.product_name ?? ""}>
            {row.product_name}
          </span>
        ),
        width: 200,
        sortable: true,
      },
      {
        id: "external_unit",
        header: "外部単位",
        accessor: (row) => row.external_unit,
        cell: (row) => (
          <span className="font-medium whitespace-nowrap text-indigo-600">{row.external_unit}</span>
        ),
        width: 120,
        sortable: true,
      },
      {
        id: "conversion_factor",
        header: "換算係数",
        accessor: (row) => row.conversion_factor,
        cell: (row) => {
          // インライン編集
          if (editingId === row.conversion_id) {
            return (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 w-24"
                  disabled={isUpdating}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveEdit(row);
                  }}
                  disabled={isUpdating}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit();
                  }}
                  disabled={isUpdating}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            );
          }
          return <span className="whitespace-nowrap">{row.conversion_factor}</span>;
        },
        width: 200,
      },
      {
        id: "remarks",
        header: "備考",
        accessor: (row) => row.remarks || "",
        cell: (row) => (
          <span className="block max-w-[150px] truncate" title={row.remarks || "-"}>
            {row.remarks || "-"}
          </span>
        ),
        width: 150,
      },
    ],
    [editingId, editValue, isUpdating, setEditValue, handleSaveEdit, handleCancelEdit],
  );

  // アクションボタン
  const renderRowActions = (conversion: UomConversionResponse) => {
    // 編集中の行にはアクションを表示しない
    if (editingId === conversion.conversion_id) {
      return null;
    }

    const inactive = isInactive(conversion.valid_to);

    if (inactive) {
      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleRestore(conversion);
            }}
            title="復元"
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handlePermanentDelete(conversion);
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
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleStartEdit(conversion);
          }}
          className="h-8 w-8 p-0"
        >
          <Pencil className="h-4 w-4 text-slate-500" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleSoftDelete(conversion);
          }}
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // 行クラス名（削除済み行を薄くする）
  const getRowClassName = (conversion: UomConversionResponse) => {
    const inactive = isInactive(conversion.valid_to);
    return inactive ? "opacity-60" : "";
  };

  return (
    <DataTable
      isLoading={isLoading}
      data={conversions}
      columns={columns}
      getRowId={(row) => row.conversion_id}
      rowActions={renderRowActions}
      getRowClassName={getRowClassName}
      emptyMessage="単位変換が登録されていません"
    />
  );
}
