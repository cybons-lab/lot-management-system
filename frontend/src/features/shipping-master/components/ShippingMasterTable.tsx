/**
 * 出荷用マスタテーブル
 */

import { Link } from "react-router-dom";

import { Button } from "@/components/ui";
import { type components } from "@/types/api";

type ShippingMasterCurated = components["schemas"]["ShippingMasterCuratedResponse"];

interface ShippingMasterTableProps {
  items: ShippingMasterCurated[];
  isLoading?: boolean;
  error?: Error | null;
}

export function ShippingMasterTable({ items, isLoading, error }: ShippingMasterTableProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">エラーが発生しました: {error.message}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">得意先</th>
            <th className="px-4 py-3 text-left text-sm font-medium">材質</th>
            <th className="px-4 py-3 text-left text-sm font-medium">次区</th>
            <th className="px-4 py-3 text-left text-sm font-medium">先方品番</th>
            <th className="px-4 py-3 text-left text-sm font-medium">メーカー品番</th>
            <th className="px-4 py-3 text-left text-sm font-medium">仕入先</th>
            <th className="px-4 py-3 text-left text-sm font-medium">出荷倉庫</th>
            <th className="px-4 py-3 text-left text-sm font-medium">輸送LT</th>
            <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                データがありません
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{item.customer_code}</div>
                  <div className="text-xs text-muted-foreground">{item.customer_name}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{item.material_code}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{item.jiku_code}</div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {item.customer_part_no || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {item.maker_part_no || "-"}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{item.supplier_code}</div>
                  <div className="text-xs text-muted-foreground">{item.supplier_name}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{item.shipping_warehouse_code}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.shipping_warehouse_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {item.transport_lt_days ? `${item.transport_lt_days}日` : "-"}
                </td>
                <td className="px-4 py-3 text-sm">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/masters/shipping-masters/${item.id}`}>編集</Link>
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
