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
import { useCustomersQuery } from "@/hooks/api/useMastersQuery";

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
          supplier_item_id: item.supplier_item_id,
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

  // メーカー品番選択オプション - maker_part_no（仕入先名）形式
  const supplierItemOptions = useMemo(
    () =>
      supplierItems.map((si) => ({
        value: String(si.id),
        label: `${si.maker_part_no}（${si.supplier_name || "仕入先不明"}）`,
      })),
    [supplierItems],
  );

  // supplier_item_id選択ハンドラ
  const handleSupplierItemSelect = (value: string) => {
    // 空文字列の場合は0を設定（未選択状態）
    if (!value || value === "") {
      setValue("supplier_item_id", 0);
      return;
    }

    const selectedSupplierItem = supplierItems.find((si) => si.id === Number(value));
    if (selectedSupplierItem) {
      setValue("supplier_item_id", selectedSupplierItem.id);
    }
  };

  const handleFormSubmit = (data: CustomerItemFormData) => {
    onSubmit(data as CreateCustomerItemRequest);
  };

  const isLoading = isLoadingCustomers || isLoadingSupplierItems;
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
                supplierItemOptions={supplierItemOptions}
                isLoadingCustomers={isLoadingCustomers}
                isLoadingSupplierItems={isLoadingSupplierItems}
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
