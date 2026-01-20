/**
 * 出荷用マスタテーブル
 */

import { shippingMasterColumns } from "./shipping-master-columns";

import { DataTable } from "@/shared/components/data/DataTable";
import { type components } from "@/types/api";

type ShippingMasterCurated = components["schemas"]["ShippingMasterCuratedResponse"];

interface ShippingMasterTableProps {
  items: ShippingMasterCurated[];
  isLoading?: boolean;
  error?: Error | null;
}

export function ShippingMasterTable({ items, isLoading, error }: ShippingMasterTableProps) {
  if (error) {
    return (
      <div className="p-8 text-center text-destructive">エラーが発生しました: {error.message}</div>
    );
  }

  return (
    <DataTable
      data={items}
      columns={shippingMasterColumns}
      isLoading={isLoading}
      emptyMessage="出荷用マスタデータがありません"
      enableColumnVisibility
      enableVirtualization
    />
  );
}
