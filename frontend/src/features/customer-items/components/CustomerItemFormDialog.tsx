/**
 * CustomerItemFormDialog
 * 得意先品番マッピングの新規登録/編集ダイアログ
 * 基本情報タブと納入先設定タブを統合
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import type { CreateCustomerItemRequest, CustomerItem } from "../api";
import { DeliverySettingsSection } from "../delivery-settings";

import { CustomerItemFormBasicSection } from "./CustomerItemFormBasicSection";
import {
  customerItemFormSchema,
  type CustomerItemFormData,
  CUSTOMER_ITEM_FORM_DEFAULTS,
} from "./customerItemFormSchema";

import { Button } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";
import { useSupplierProductsQuery } from "@/features/supplier-products/hooks/useSupplierProductsQuery";
import { useCustomersQuery, useProductsQuery } from "@/hooks/api/useMastersQuery";

interface CustomerItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CustomerItem;
  onSubmit: (data: CreateCustomerItemRequest) => void;
  isSubmitting?: boolean;
  mode: "create" | "edit";
}

/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
export function CustomerItemFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isSubmitting = false,
  mode,
}: CustomerItemFormDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("basic");

  // Master data for select options
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomersQuery();
  const { data: products = [], isLoading: isLoadingProducts } = useProductsQuery();
  const { data: supplierItems = [], isLoading: isLoadingSupplierItems } =
    useSupplierProductsQuery();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CustomerItemFormData>({
    resolver: zodResolver(customerItemFormSchema),
    defaultValues: item
      ? {
          customer_id: item.customer_id,
          customer_part_no: item.customer_part_no,
          product_group_id: item.product_group_id,
          supplier_id: item.supplier_id,
          supplier_item_id: item.supplier_item_id,
          is_primary: item.is_primary,
          base_unit: item.base_unit,
          pack_unit: item.pack_unit,
          pack_quantity: item.pack_quantity,
          special_instructions: item.special_instructions,
        }
      : CUSTOMER_ITEM_FORM_DEFAULTS,
  });

  // Generate select options
  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: `${c.customer_code} - ${c.customer_name}`,
      })),
    [customers],
  );

  // 製品選択オプション - 製品コード（製品名）形式
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: `${p.product_code}（${p.product_name}）`,
      })),
    [products],
  );

  // Phase1: メーカー品番選択オプション - maker_part_no（仕入先名）形式
  const supplierItemOptions = useMemo(
    () =>
      supplierItems.map((si) => ({
        value: String(si.id),
        label: `${si.maker_part_no}（${si.supplier_name || "仕入先不明"}）`,
      })),
    [supplierItems],
  );

  const handleProductSelect = (value: string) => {
    // Phase1: product_group_idはオプション、空文字列の場合はnullを設定
    setValue("product_group_id", value && value !== "" ? Number(value) : null);
  };

  // Phase1: supplier_item_id選択ハンドラ
  const handleSupplierItemSelect = (value: string) => {
    // 空文字列の場合は0を設定（未選択状態）
    if (!value || value === "") {
      setValue("supplier_item_id", 0);
      setValue("supplier_id", null);
      return;
    }

    const selectedSupplierItem = supplierItems.find((si) => si.id === Number(value));
    if (selectedSupplierItem) {
      setValue("supplier_item_id", selectedSupplierItem.id);
      // supplier_idは非推奨だがバックエンド互換性のため設定
      setValue("supplier_id", selectedSupplierItem.supplier_id);
    }
  };

  const handleFormSubmit = (data: CustomerItemFormData) => {
    onSubmit(data as CreateCustomerItemRequest);
  };

  const isLoading = isLoadingCustomers || isLoadingProducts || isLoadingSupplierItems;
  const isEditMode = mode === "edit" && item;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "得意先品番マッピング新規登録" : "得意先品番マッピング編集"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">
              基本情報
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex-1" disabled={!isEditMode}>
              納入先別設定
              {!isEditMode && <span className="ml-1 text-xs text-slate-400">（保存後に設定）</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
              <CustomerItemFormBasicSection
                control={control}
                errors={errors}
                isSubmitting={isSubmitting}
                isLoading={isLoading}
                customerOptions={customerOptions}
                productOptions={productOptions}
                supplierItemOptions={supplierItemOptions}
                isLoadingCustomers={isLoadingCustomers}
                isLoadingProducts={isLoadingProducts}
                isLoadingSupplierItems={isLoadingSupplierItems}
                onProductSelect={handleProductSelect}
                onSupplierItemSelect={handleSupplierItemSelect}
              />

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoading}>
                  {isSubmitting
                    ? mode === "edit"
                      ? "更新中..."
                      : "登録中..."
                    : mode === "edit"
                      ? "更新"
                      : "登録"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="delivery" className="mt-4">
            {isEditMode ? (
              <DeliverySettingsSection
                customerItemId={item.id}
                customerId={item.customer_id}
                customerPartNo={item.customer_part_no}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
                <p className="text-sm text-slate-500">
                  納入先別設定を追加するには、先に基本情報を保存してください。
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
