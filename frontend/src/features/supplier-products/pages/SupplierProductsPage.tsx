import { Package, Building2, Upload } from "lucide-react";
import { useState } from "react";

import { SupplierProductBulkImportDialog } from "../components/SupplierProductBulkImportDialog";
import { SupplierProductExportButton } from "../components/SupplierProductExportButton";
import { useSupplierProducts } from "../hooks/useSupplierProducts";

import { Button } from "@/components/ui";

interface SupplierProduct {
  supplier_code: string;
  supplier_name: string;
  product_code: string;
  product_name: string;
  order_unit?: string;
  order_lot_size?: number;
}

function SupplierProductTableHeader() {
  return (
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
  );
}

function SupplierProductTableRow({ product }: { product: SupplierProduct }) {
  return (
    <tr className="hover:bg-slate-50">
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
  );
}

export function SupplierProductsPage() {
  const { useList } = useSupplierProducts();
  const { data: products = [], isLoading, error, isError } = useList();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Debug logging
  console.log("[SupplierProductsPage] Query state:", {
    isLoading,
    isError,
    error,
    dataLength: products?.length,
    data: products,
  });

  if (isLoading) {
    return <div className="p-6">読み込み中...</div>;
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-lg font-semibold text-red-900">データの取得に失敗しました</p>
          <p className="mt-2 text-sm text-red-700">
            {error instanceof Error ? error.message : "不明なエラー"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">仕入先商品</h1>
          <p className="mt-1 text-sm text-slate-600">仕入先別の製品情報を管理します</p>
        </div>
        <div className="flex gap-2">
          <SupplierProductExportButton size="sm" />
          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            インポート
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <SupplierProductTableHeader />
          <tbody className="divide-y divide-slate-200 bg-white">
            {products.map((product, index) => (
              <SupplierProductTableRow key={index} product={product} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-slate-600">{products.length} 件の仕入先商品</div>

      <SupplierProductBulkImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
    </div>
  );
}
