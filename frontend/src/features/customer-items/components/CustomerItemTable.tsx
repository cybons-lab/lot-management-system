/**
 * CustomerItemTable (v2.2 - Phase G-1)
 * Refactored to use DataTable component.
 * Table component for displaying customer item mappings
 *
 * Updated: サロゲートキー（id）ベースに移行
 */

import { useMemo } from "react";

import type { CustomerItem } from "../api";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

interface CustomerItemTableProps {
  items: CustomerItem[];
  onDelete: (id: number) => void;
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
        id: "customer_part_no",
        header: "得意先品番",
        accessor: (row) => row.customer_part_no,
        cell: (row) => <span className="font-medium">{row.customer_part_no}</span>,
        width: 150,
        sortable: true,
      },
      {
        id: "maker_part_no",
        header: "メーカー品番",
        accessor: (row) => row.maker_part_no,
        cell: (row) => <span className="font-mono text-sm">{row.maker_part_no || "-"}</span>,
        width: 150,
        sortable: true,
      },
      {
        id: "display_name",
        header: "製品名",
        accessor: (row) => row.display_name,
        cell: (row) => row.display_name || "-",
        width: 150,
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
          onClick={() => onDelete(item.id)}
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
      getRowId={(row) => row.id.toString()}
      rowActions={renderRowActions}
      emptyMessage="得意先品目マッピングがありません"
    />
  );
}
