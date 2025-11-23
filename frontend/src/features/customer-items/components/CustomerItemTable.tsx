/**
 * CustomerItemTable (v2.2 - Phase G-1)
 * Table component for displaying customer item mappings
 */

import type { CustomerItem } from "../api";

import { Button } from "@/components/ui";

interface CustomerItemTableProps {
  items: CustomerItem[];
  onDelete: (customerId: number, externalProductCode: string) => void;
  onEdit?: (item: CustomerItem) => void;
  isDeleting?: boolean;
}

export function CustomerItemTable({
  items,
  onDelete,
  onEdit,
  isDeleting = false,
}: CustomerItemTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">得意先ID</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">得意先品番</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">製品ID</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">仕入先ID</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">基本単位</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">梱包単位</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">梱包数量</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">特記事項</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr
              key={`${item.customer_id}-${item.external_product_code}`}
              className="hover:bg-gray-50"
            >
              <td className="px-4 py-3 text-sm">{item.customer_id}</td>
              <td className="px-4 py-3 text-sm font-medium">{item.external_product_code}</td>
              <td className="px-4 py-3 text-sm">{item.product_id}</td>
              <td className="px-4 py-3 text-sm">{item.supplier_id ?? "-"}</td>
              <td className="px-4 py-3 text-sm">{item.base_unit}</td>
              <td className="px-4 py-3 text-sm">{item.pack_unit ?? "-"}</td>
              <td className="px-4 py-3 text-right text-sm">{item.pack_quantity ?? "-"}</td>
              <td className="px-4 py-3 text-sm">
                {item.special_instructions ? (
                  <span className="line-clamp-2" title={item.special_instructions}>
                    {item.special_instructions}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex gap-2">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(item)}
                      disabled={isDeleting}
                    >
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
