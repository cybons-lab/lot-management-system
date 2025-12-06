/**
 * ProductSupplierSection - 製品に紐づく仕入先一覧を表示
 */
import { useQuery } from "@tanstack/react-query";
import { Store, Star } from "lucide-react";

import { getProductSuppliers, type ProductSupplier } from "../api";

import { Badge } from "@/components/ui/display/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/display/card";

interface ProductSupplierSectionProps {
  productCode: string;
}

// eslint-disable-next-line max-lines-per-function
export function ProductSupplierSection({ productCode }: ProductSupplierSectionProps) {
  const {
    data: suppliers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["product-suppliers", productCode],
    queryFn: () => getProductSuppliers(productCode),
    enabled: !!productCode,
  });

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5" />
            仕入先
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5" />
            仕入先
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">仕入先情報の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Store className="h-5 w-5" />
          仕入先
          {suppliers && suppliers.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {suppliers.length}件
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!suppliers || suppliers.length === 0 ? (
          <p className="text-sm text-gray-500">この製品に紐づく仕入先はありません</p>
        ) : (
          <div className="space-y-3">
            {suppliers.map((supplier: ProductSupplier) => (
              <div
                key={supplier.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${supplier.is_primary ? "border-amber-300 bg-amber-50" : "bg-white"
                  }`}
              >
                <div className="flex items-center gap-3">
                  {supplier.is_primary && (
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  )}
                  <div>
                    <span className="font-medium">
                      {supplier.supplier_name}
                      {supplier.is_primary && (
                        <Badge variant="default" className="ml-2 bg-amber-500">
                          主要仕入先
                        </Badge>
                      )}
                    </span>
                    <p className="text-sm text-gray-500">{supplier.supplier_code}</p>
                  </div>
                </div>
                {supplier.lead_time_days !== null && (
                  <div className="text-right text-sm text-gray-600">
                    <span className="font-medium">{supplier.lead_time_days}</span>日
                    <span className="block text-xs text-gray-400">リードタイム</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
