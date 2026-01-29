/**
 * CustomerItemForm (v3.0 - Simplified)
 * Form component for creating customer item mappings
 *
 * Updated: OCR/SAP fields removed (now in ShippingMasterCurated)
 * - customer_part_no フィールド使用
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import type { CreateCustomerItemRequest, CustomerItem } from "../api";

import { CustomerItemFormBasicSection } from "./CustomerItemFormBasicSection";
import {
  customerItemFormSchema,
  type CustomerItemFormData,
  CUSTOMER_ITEM_FORM_DEFAULTS,
} from "./customerItemFormSchema";

import { Button } from "@/components/ui";
import { useSupplierProductsQuery } from "@/features/supplier-products/hooks/useSupplierProductsQuery";
import { useCustomersQuery } from "@/hooks/api/useMastersQuery";

interface CustomerItemFormProps {
  item?: CustomerItem;
  onSubmit: (data: CreateCustomerItemRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CustomerItemForm({
  item,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CustomerItemFormProps) {
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
          supplier_item_id: item.supplier_item_id ?? 0,
          base_unit: item.base_unit || "EA",
          pack_unit: item.pack_unit ?? null,
          pack_quantity: item.pack_quantity ?? null,
          special_instructions: item.special_instructions ?? null,
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

  return (
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting ? (item ? "更新中..." : "登録中...") : item ? "更新" : "登録"}
        </Button>
      </div>
    </form>
  );
}
