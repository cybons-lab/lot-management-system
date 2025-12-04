/**
 * CustomerItemsTable - Table component for customer items.
 */
import { Building2, Package } from "lucide-react";

import type { CustomerItem } from "../api";

import { Button } from "@/components/ui";

interface CustomerItemsTableProps {
  items: CustomerItem[];
  isLoading: boolean;
  isDeleting: boolean;
  onDelete: (customerId: number, externalProductCode: string) => void;
}

function TableHeader() {
  return (
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
          得意先
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
          得意先品番
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
          製品
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
          仕入先
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
          基本単位
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
          包装単位
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
          包装数量
        </th>
        <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-700 uppercase">
          操作
        </th>
      </tr>
    </thead>
  );
}

interface TableRowProps {
  item: CustomerItem;
  isDeleting: boolean;
  onDelete: (customerId: number, externalProductCode: string) => void;
}

function TableRow({ item, isDeleting, onDelete }: TableRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-orange-600" />
          <div>
            <div className="font-medium">{item.customer_code}</div>
            <div className="text-xs text-gray-500">{item.customer_name}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
        {item.external_product_code}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-green-600" />
          <div>
            <div className="font-medium">{item.product_name}</div>
            <div className="text-xs text-gray-500">ID: {item.product_id}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {item.supplier_name ? (
          <div>
            <div className="font-medium">{item.supplier_code}</div>
            <div className="text-xs text-gray-500">{item.supplier_name}</div>
          </div>
        ) : (
          "-"
        )}
      </td>
      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">{item.base_unit}</td>
      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">{item.pack_unit || "-"}</td>
      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
        {item.pack_quantity || "-"}
      </td>
      <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(item.customer_id, item.external_product_code)}
          disabled={isDeleting}
        >
          削除
        </Button>
      </td>
    </tr>
  );
}

export function CustomerItemsTable({
  items,
  isLoading,
  isDeleting,
  onDelete,
}: CustomerItemsTableProps) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold">マッピング一覧</h3>
        <p className="text-sm text-gray-600">{items.length} 件のマッピング</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          得意先品番マッピングが登録されていません
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <TableHeader />
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((item) => (
                <TableRow
                  key={`${item.customer_id}-${item.external_product_code}`}
                  item={item}
                  isDeleting={isDeleting}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
