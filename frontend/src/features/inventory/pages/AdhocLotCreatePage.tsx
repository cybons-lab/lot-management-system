/**
 * AdhocLotCreatePage.tsx
 *
 * アドホックロット新規作成ページ
 * 受注非連動ロット（サンプル、安全在庫、その他）を作成
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createLot } from "../api";
import { AdhocLotCreateForm, type AdhocLotCreateData } from "../components/AdhocLotCreateForm";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import { useProducts } from "@/features/products/hooks";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { useWarehouses } from "@/features/warehouses/hooks";

/**
 * 入庫登録（旧アドホックロット作成）ページ
 */
// eslint-disable-next-line max-lines-per-function -- Page component with data fetching logic
export function AdhocLotCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // マスタデータ取得
  const { useList: useProductList } = useProducts();
  const { useList: useWarehouseList } = useWarehouses();
  const { useList: useSupplierList } = useSuppliers();

  const { data: products = [], isLoading: isLoadingProducts } = useProductList();
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouseList();
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSupplierList();

  // 仕入先のフィルタリングロジック
  // ユーザーに主担当(is_primary=true)の仕入先がある場合、それに絞り込む
  const primaryAssignmentIds =
    user?.assignments?.filter((a) => a.is_primary).map((a) => a.supplier_id) || [];

  const filteredSuppliers =
    primaryAssignmentIds.length > 0
      ? suppliers.filter((s) => primaryAssignmentIds.includes(s.id))
      : suppliers;

  // ロット作成Mutation
  const { mutateAsync: createAdhocLot, isPending } = useMutation({
    mutationFn: async (data: AdhocLotCreateData) => {
      // API形式に変換
      const payload = {
        lot_number: data.lot_number,
        product_id: data.product_id,
        warehouse_id: data.warehouse_id,
        supplier_code: data.supplier_code,
        received_date: data.received_date,
        expiry_date: data.expiry_date,
        current_quantity: data.current_quantity,
        received_quantity: data.current_quantity, // Initial receipt amount
        remaining_quantity: data.current_quantity, // Initial remaining amount
        unit: data.unit,
        origin_type: data.origin_type,
        origin_reference: data.origin_reference,
        status: "active" as const,
        allocated_quantity: 0,
        locked_quantity: 0,
        inspection_status: "not_required" as const,
      };
      return createLot(payload);
    },
    onSuccess: (result) => {
      // Invalidate all related queries for hot reload
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(`ロットを作成しました: ${result.lot_number}`);
      navigate("/inventory");
    },
    // グローバルエラーハンドラー（query-client.ts）がトーストを表示するため、ここでは何もしない
  });

  const handleSubmit = async (data: AdhocLotCreateData) => {
    await createAdhocLot(data);
  };

  const handleCancel = () => {
    navigate("/inventory");
  };

  const isLoading = isLoadingProducts || isLoadingWarehouses || isLoadingSuppliers;

  // 製品リストを変換
  const productOptions = products.map((p) => ({
    id: p.id ?? 0,
    product_code: p.product_code ?? "",
    product_name: p.product_name ?? "",
    supplier_ids: p.supplier_ids ?? [],
  }));

  // 倉庫リストを変換
  const warehouseOptions = warehouses.map((w) => ({
    id: w.id ?? 0,
    warehouse_code: w.warehouse_code ?? "",
    warehouse_name: w.warehouse_name ?? "",
  }));

  // 仕入先リストを変換
  const supplierOptions = filteredSuppliers.map((s) => ({
    id: s.id ?? 0,
    supplier_code: s.supplier_code ?? "",
    supplier_name: s.supplier_name ?? "",
  }));

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/inventory")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          在庫一覧に戻る
        </Button>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>入庫登録</CardTitle>
          <CardDescription>
            新規ロット（サンプル、安全在庫、一般入荷など）を登録します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">マスタデータを読み込み中...</span>
            </div>
          ) : (
            <AdhocLotCreateForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isPending}
              products={productOptions}
              warehouses={warehouseOptions}
              suppliers={supplierOptions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
