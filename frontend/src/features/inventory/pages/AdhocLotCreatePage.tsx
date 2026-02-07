/**
 * AdhocLotCreatePage.tsx
 *
 * アドホックロット新規作成ページ
 * 受注非連動ロット（サンプル、安全在庫、その他）を作成
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { createLot } from "../api";
import { AdhocLotCreateForm, type AdhocLotCreateData } from "../components/AdhocLotCreateForm";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import { useSupplierProducts } from "@/features/supplier-products/hooks";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { useWarehouses } from "@/features/warehouses/hooks";

const INVENTORY_ROUTE = "/inventory";

function useAdhocMasterData() {
  const { user } = useAuth();
  const { useList: useProductList } = useSupplierProducts();
  const { useList: useWarehouseList } = useWarehouses();
  const { useList: useSupplierList } = useSuppliers();

  const { data: products = [], isLoading: isLoadingProducts } = useProductList();
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouseList();
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSupplierList();

  const assignedSupplierIds = useMemo(
    () => user?.assignments?.map((assignment) => assignment.supplier_id) || [],
    [user?.assignments],
  );

  const filteredSuppliers = useMemo(() => {
    if (assignedSupplierIds.length === 0) {
      return suppliers;
    }
    return suppliers.filter((supplier) => assignedSupplierIds.includes(supplier.id));
  }, [assignedSupplierIds, suppliers]);

  const isLoading = isLoadingProducts || isLoadingWarehouses || isLoadingSuppliers;

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        id: product.id ?? 0,
        product_code: product.maker_part_no ?? "",
        product_name: product.display_name ?? "",
        supplier_ids: product.supplier_id ? [product.supplier_id] : [],
      })),
    [products],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        id: warehouse.id ?? 0,
        warehouse_code: warehouse.warehouse_code ?? "",
        warehouse_name: warehouse.warehouse_name ?? "",
      })),
    [warehouses],
  );

  const supplierOptions = useMemo(
    () =>
      filteredSuppliers.map((supplier) => ({
        id: supplier.id ?? 0,
        supplier_code: supplier.supplier_code ?? "",
        supplier_name: supplier.supplier_name ?? "",
      })),
    [filteredSuppliers],
  );

  return {
    isLoading,
    productOptions,
    warehouseOptions,
    supplierOptions,
  };
}

function useCreateAdhocLotMutation(navigate: ReturnType<typeof useNavigate>) {
  const queryClient = useQueryClient();
  const { mutateAsync: createAdhocLot, isPending } = useMutation({
    mutationFn: async (data: AdhocLotCreateData) =>
      createLot({
        lot_number: data.lot_number,
        supplier_item_id: data.supplier_item_id,
        warehouse_id: data.warehouse_id,
        received_date: data.received_date,
        current_quantity: data.current_quantity,
        received_quantity: data.current_quantity,
        remaining_quantity: data.current_quantity,
        unit: data.unit,
        origin_type: data.origin_type,
        origin_reference: data.origin_reference ?? null,
        status: "active",
        allocated_quantity: 0,
        locked_quantity: 0,
        inspection_status: "not_required",
        ...(data.supplier_code ? { supplier_code: data.supplier_code } : {}),
        ...(data.expiry_date ? { expiry_date: data.expiry_date } : {}),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(`ロットを作成しました: ${result.lot_number}`);
      navigate(INVENTORY_ROUTE);
    },
  });

  const handleSubmit = useCallback(
    async (data: AdhocLotCreateData) => {
      await createAdhocLot(data);
    },
    [createAdhocLot],
  );

  const handleCancel = useCallback(() => {
    navigate(INVENTORY_ROUTE);
  }, [navigate]);

  return {
    isPending,
    handleSubmit,
    handleCancel,
  };
}

function useAdhocLotCreatePageModel() {
  const navigate = useNavigate();
  const masterData = useAdhocMasterData();
  const mutation = useCreateAdhocLotMutation(navigate);

  return {
    navigate,
    ...masterData,
    ...mutation,
  };
}

export function AdhocLotCreatePage() {
  const model = useAdhocLotCreatePageModel();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => model.navigate(INVENTORY_ROUTE)} className="mb-4">
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
          {model.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">マスタデータを読み込み中...</span>
            </div>
          ) : (
            <AdhocLotCreateForm
              onSubmit={model.handleSubmit}
              onCancel={model.handleCancel}
              isSubmitting={model.isPending}
              products={model.productOptions}
              warehouses={model.warehouseOptions}
              suppliers={model.supplierOptions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
