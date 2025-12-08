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
import { useProducts } from "@/features/products/hooks";
import { useWarehouses } from "@/features/warehouses/hooks";

/**
 * アドホックロット作成ページ
 */
// eslint-disable-next-line max-lines-per-function -- Page component with data fetching logic
export function AdhocLotCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 製品・倉庫リストを取得
  const { useList: useProductList } = useProducts();
  const { useList: useWarehouseList } = useWarehouses();
  const { data: products = [], isLoading: isLoadingProducts } = useProductList();
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouseList();

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
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      toast.success(`アドホックロットを作成しました: ${result.lot_number}`);
      navigate("/inventory");
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
    },
  });

  const handleSubmit = async (data: AdhocLotCreateData) => {
    await createAdhocLot(data);
  };

  const handleCancel = () => {
    navigate("/inventory");
  };

  const isLoading = isLoadingProducts || isLoadingWarehouses;

  // 製品リストを変換
  const productOptions = products.map((p) => ({
    id: p.id ?? 0,
    product_code: p.product_code ?? "",
    product_name: p.product_name ?? "",
  }));

  // 倉庫リストを変換
  const warehouseOptions = warehouses.map((w) => ({
    id: w.id ?? 0,
    warehouse_code: w.warehouse_code ?? "",
    warehouse_name: w.warehouse_name ?? "",
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
          <CardTitle>アドホックロット作成</CardTitle>
          <CardDescription>
            受注に紐づかないロット（サンプル、安全在庫など）を作成します。
            ロット番号は自動的に生成されます。
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
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
