/**
 * CustomerItemTable (v2.2 - Phase G-1)
 * Refactored to use DataTable component.
 * Table component for displaying customer item mappings
 */

import { useMemo } from "react";

import type { CustomerItem } from "../api";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

interface CustomerItemTableProps {
  items: CustomerItem[];
  onDelete: (customerId: number, externalProductCode: string) => void;
  onEdit?: (item: CustomerItem) => void;
  isDeleting?: boolean;
}

// eslint-disable-next-line max-lines-per-function
export function CustomerItemTable({
  items,
  onDelete,
  onEdit,
  isDeleting = false,
}: CustomerItemTableProps) {
  // 列定義
  const columns = useMemo<Column<CustomerItem>[]>(
    () => [
      {
        id: "customer_id",
        header: "得意先ID",
        accessor: (row) => row.customer_id,
        width: 100,
        sortable: true,
      },
      {
        id: "external_product_code",
        header: "得意先品番",
        accessor: (row) => row.external_product_code,
        cell: (row) => <span className="font-medium">{row.external_product_code}</span>,
        width: 150,
        sortable: true,
      },
      {
        id: "product_id",
        header: "製品ID",
        accessor: (row) => row.product_id,
        width: 100,
        sortable: true,
      },
      {
        id: "supplier_id",
        header: "仕入先ID",
        accessor: (row) => row.supplier_id ?? 0,
        cell: (row) => row.supplier_id ?? "-",
        width: 100,
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
        id: "pack_unit",
        header: "梱包単位",
        accessor: (row) => row.pack_unit || "",
        cell: (row) => row.pack_unit ?? "-",
        width: 100,
        sortable: true,
      },
      {
        id: "pack_quantity",
        header: "梱包数量",
        accessor: (row) => row.pack_quantity || 0,
        cell: (row) => row.pack_quantity ?? "-",
        width: 100,
        align: "right",
        sortable: true,
      },
      {
        id: "special_instructions",
        header: "特記事項",
        accessor: (row) => row.special_instructions || "",
        cell: (row) =>
          row.special_instructions ? (
            <span className="line-clamp-2" title={row.special_instructions}>
              {row.special_instructions}
            </span>
          ) : (
            "-"
          ),
        width: 200,
      },
    ],
    [],
  );

  // アクションボタン
  const renderRowActions = (item: CustomerItem) => {
    return (
      <div className="flex gap-2">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(item)} disabled={isDeleting}>
            編集
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(item.customer_id, item.external_product_code)}
          disabled={isDeleting}
        >
          削除
        </Button>
      </div>
    );
  };

  return (
    <DataTable
      data={items}
      columns={columns}
      getRowId={(row) => `${row.customer_id}-${row.external_product_code}`}
      rowActions={renderRowActions}
      emptyMessage="得意先品目マッピングがありません"
    />
  );
}
