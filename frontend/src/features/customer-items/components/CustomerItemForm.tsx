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
import { useCustomersQuery, useProductsQuery } from "@/hooks/api/useMastersQuery";

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
  const { data: products = [], isLoading: isLoadingProducts } = useProductsQuery();

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
          product_id: item.product_id,
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

  const handleProductSelect = (value: string) => {
    setValue("product_id", value ? Number(value) : 0);
    // customer_part_noはマニュアル入力なので自動設定しない
  };

  const handleFormSubmit = (data: CustomerItemFormData) => {
    onSubmit(data as CreateCustomerItemRequest);
  };

  const isLoading = isLoadingCustomers || isLoadingProducts;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <CustomerItemFormBasicSection
        control={control}
        errors={errors}
        isSubmitting={isSubmitting}
        isLoading={isLoading}
        customerOptions={customerOptions}
        productOptions={productOptions}
        isLoadingCustomers={isLoadingCustomers}
        isLoadingProducts={isLoadingProducts}
        onProductSelect={handleProductSelect}
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
