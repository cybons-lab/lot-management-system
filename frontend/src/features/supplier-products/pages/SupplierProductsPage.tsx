import { Package, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { http } from "@/shared/api/http-client";
import type { SupplierProduct } from "../api";

export function SupplierProductsPage() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["supplier-products"],
    queryFn: async () => {
      return http.get<SupplierProduct[]>("masters/supplier-products");
    },
  });

  if (isLoading) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">仕入先商品</h1>
        <p className="mt-1 text-sm text-slate-600">仕入先別の製品情報を管理します</p>
      </div>

      {/* テーブル */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                仕入先コード
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                仕入先名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                製品コード
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                製品名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                発注単位
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-slate-700 uppercase">
                発注ロットサイズ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {products.map((product: any, index: number) => (
              <tr key={index} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-900">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-600" />
                    {product.supplier_code}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">{product.supplier_name}</td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-900">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-600" />
                    {product.product_code}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">{product.product_name}</td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-600">
                  {product.order_unit || "-"}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-slate-600">
                  {product.order_lot_size || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 件数表示 */}
      <div className="text-sm text-slate-600">{products.length} 件の仕入先商品</div>
    </div>
  );
}
