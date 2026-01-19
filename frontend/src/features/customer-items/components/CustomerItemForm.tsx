/**
 * CustomerItemForm (v2.5 - react-hook-form + Zod)
 * Form component for creating customer item mappings
 * OCR-SAP変換フィールド対応版
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import type { CreateCustomerItemRequest, CustomerItem } from "../api";

import { CustomerItemFormBasicSection } from "./CustomerItemFormBasicSection";
import { CustomerItemFormOcrSapSection } from "./CustomerItemFormOcrSapSection";
import { CustomerItemFormSapCacheSection } from "./CustomerItemFormSapCacheSection";
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
          external_product_code: item.external_product_code,
          product_id: item.product_id,
          supplier_id: item.supplier_id,
          base_unit: item.base_unit,
          pack_unit: item.pack_unit,
          pack_quantity: item.pack_quantity,
          special_instructions: item.special_instructions,
          maker_part_no: item.maker_part_no,
          order_category: item.order_category,
          is_procurement_required: item.is_procurement_required,
          shipping_slip_text: item.shipping_slip_text,
          ocr_conversion_notes: item.ocr_conversion_notes,
          sap_supplier_code: item.sap_supplier_code,
          sap_warehouse_code: item.sap_warehouse_code,
          sap_shipping_warehouse: item.sap_shipping_warehouse,
          sap_uom: item.sap_uom,
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

  // 先方品番（商品名）形式のオプション - 先方品番があるもののみ
  const productOptions = useMemo(
    () =>
      products
        .filter((p) => p.customer_part_no)
        .map((p) => ({
          value: String(p.id),
          label: `${p.customer_part_no}（${p.product_name}）`,
          customer_part_no: p.customer_part_no,
        })),
    [products],
  );

  const handleProductSelect = (value: string) => {
    const selected = productOptions.find((opt) => opt.value === value);
    setValue("product_id", value ? Number(value) : 0);
    setValue("external_product_code", selected?.customer_part_no ?? "");
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

      {/* OCR→SAP変換設定とSAPキャッシュ設定を2段レイアウト */}
      <div className="grid gap-4 md:grid-cols-2">
        <CustomerItemFormOcrSapSection control={control} isSubmitting={isSubmitting} />
        <CustomerItemFormSapCacheSection control={control} isSubmitting={isSubmitting} />
      </div>

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
