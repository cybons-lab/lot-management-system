import { RotateCcw, Pencil, Trash2 } from "lucide-react";

import type { Customer } from "../api";

import { Button } from "@/components/ui";
import { type Column } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

// Extend Customer type locally if needed
export type CustomerWithValidTo = Customer & { valid_to?: string };

export const isInactive = (validTo?: string | null) => {
  if (!validTo) return false;
  const today = new Date().toISOString().split("T")[0] ?? "";
  return validTo <= today;
};

interface CreateColumnsParams {
  onRestore: (row: CustomerWithValidTo) => void;
  onPermanentDelete: (row: CustomerWithValidTo) => void;
  onEdit: (row: CustomerWithValidTo) => void;
  onSoftDelete: (row: CustomerWithValidTo) => void;
}

const renderCustomerCode = (row: CustomerWithValidTo) => (
  <div className="flex items-center">
    <span className="font-mono text-sm font-medium text-gray-900">{row.customer_code}</span>
    {isInactive(row.valid_to) && (
      <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">削除済</span>
    )}
  </div>
);

const renderCustomerName = (row: CustomerWithValidTo) => (
  <span
    className={`block max-w-[300px] truncate ${isInactive(row.valid_to) ? "text-muted-foreground" : "text-gray-900"}`}
    title={row.customer_name}
  >
    {row.customer_name}
  </span>
);

const renderActions = (
  row: CustomerWithValidTo,
  { onRestore, onPermanentDelete, onEdit, onSoftDelete }: CreateColumnsParams,
) => {
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
};

export function createColumns(params: CreateColumnsParams): Column<CustomerWithValidTo>[] {
  return [
    {
      id: "customer_code",
      header: "得意先コード",
      cell: renderCustomerCode,
      sortable: true,
      width: "200px",
    },
    {
      id: "customer_name",
      header: "得意先名",
      cell: renderCustomerName,
      sortable: true,
      width: "300px",
    },
    {
      id: "created_at",
      header: "作成日時",
      cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.created_at)}</span>,
      sortable: true,
      width: "150px",
    },
    {
      id: "updated_at",
      header: "更新日時",
      cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.updated_at)}</span>,
      sortable: true,
      width: "150px",
    },
    {
      id: "actions",
      header: "操作",
      cell: (row) => renderActions(row, params),
    },
  ];
}
