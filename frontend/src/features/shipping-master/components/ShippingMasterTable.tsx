/**
 * 出荷用マスタテーブル
 */

import { createShippingMasterColumns } from "./shipping-master-columns";

import { DataTable } from "@/shared/components/data/DataTable";
import { type components } from "@/types/api";

type ShippingMasterCurated = components["schemas"]["ShippingMasterCuratedResponse"];

interface ShippingMasterTableProps {
  items: ShippingMasterCurated[];
  isLoading?: boolean;
  error?: Error | null;
  onEdit?: (row: ShippingMasterCurated) => void;
  onDelete?: (row: ShippingMasterCurated) => void;
}

export function ShippingMasterTable({
  items,
  isLoading,
  error,
  onEdit,
  onDelete,
}: ShippingMasterTableProps) {
  if (error) {
    return (
      <div className="p-8 text-center text-destructive">エラーが発生しました: {error.message}</div>
    );
  }

  const columns = createShippingMasterColumns({ onEdit, onDelete });

  return (
    <DataTable
      data={items}
      columns={columns}
      isLoading={isLoading}
      emptyMessage="出荷用マスタデータがありません"
      enableVirtualization
    />
  );
}
