/**
 * CustomerItemForm (v2.4 - react-hook-form + Zod)
 * Form component for creating customer item mappings
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";

import type { CreateCustomerItemRequest } from "../api";

import {
  customerItemFormSchema,
  type CustomerItemFormData,
  CUSTOMER_ITEM_FORM_DEFAULTS,
} from "./customerItemFormSchema";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { useCustomersQuery, useProductsQuery } from "@/hooks/api/useMastersQuery";

interface CustomerItemFormProps {
  onSubmit: (data: CreateCustomerItemRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CustomerItemForm({
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
    defaultValues: CUSTOMER_ITEM_FORM_DEFAULTS,
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

  // 先方品番（製品名）形式のオプション - 先方品番があるもののみ
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
      {/* Customer Selection */}
      <div>
        <Label htmlFor="customer_id" className="mb-2 block text-sm font-medium">
          得意先 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="customer_id"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              options={customerOptions}
              value={field.value ? String(field.value) : ""}
              onChange={(value) => field.onChange(value ? Number(value) : 0)}
              placeholder={isLoadingCustomers ? "読込中..." : "得意先を検索..."}
              disabled={isSubmitting || isLoading}
            />
          )}
        />
        {errors.customer_id && (
          <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
        )}
      </div>

      {/* 先方品番（製品）選択 */}
      <div>
        <Label htmlFor="product_id" className="mb-2 block text-sm font-medium">
          先方品番 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="product_id"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              options={productOptions}
              value={field.value ? String(field.value) : ""}
              onChange={(value) => {
                handleProductSelect(value);
              }}
              placeholder={isLoadingProducts ? "読込中..." : "先方品番を検索..."}
              disabled={isSubmitting || isLoading}
            />
          )}
        />
        {errors.product_id && (
          <p className="mt-1 text-sm text-red-600">{errors.product_id.message}</p>
        )}
      </div>

      {/* Base Unit */}
      <div>
        <Label htmlFor="base_unit" className="mb-2 block text-sm font-medium">
          基本単位 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="base_unit"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="base_unit"
              type="text"
              placeholder="基本単位を入力（例: EA, KG, CS）"
              disabled={isSubmitting}
              maxLength={20}
            />
          )}
        />
        {errors.base_unit && (
          <p className="mt-1 text-sm text-red-600">{errors.base_unit.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">例: EA（個）, KG（キログラム）, CS（ケース）</p>
      </div>

      {/* Pack Unit */}
      <div>
        <Label htmlFor="pack_unit" className="mb-2 block text-sm font-medium">
          梱包単位
        </Label>
        <Controller
          name="pack_unit"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value || null)}
              id="pack_unit"
              type="text"
              placeholder="梱包単位を入力（オプション）"
              disabled={isSubmitting}
              maxLength={20}
            />
          )}
        />
      </div>

      {/* Pack Quantity */}
      <div>
        <Label htmlFor="pack_quantity" className="mb-2 block text-sm font-medium">
          梱包数量
        </Label>
        <Controller
          name="pack_quantity"
          control={control}
          render={({ field }) => (
            <Input
              id="pack_quantity"
              type="number"
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              placeholder="梱包数量を入力（オプション）"
              disabled={isSubmitting}
            />
          )}
        />
      </div>

      {/* Special Instructions */}
      <div>
        <Label htmlFor="special_instructions" className="mb-2 block text-sm font-medium">
          特記事項
        </Label>
        <Controller
          name="special_instructions"
          control={control}
          render={({ field }) => (
            <textarea
              id="special_instructions"
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value || null)}
              placeholder="特記事項を入力（オプション）"
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={isSubmitting}
            />
          )}
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting ? "登録中..." : "登録"}
        </Button>
      </div>
    </form>
  );
}
