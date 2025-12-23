/**
 * CustomerItemFormBasicSection
 * 得意先品番の基本情報セクション（フォーム用）
 */

import { type Control, Controller, type FieldErrors } from "react-hook-form";

import type { CustomerItemFormData } from "./customerItemFormSchema";

import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";

interface Option {
  value: string;
  label: string;
  customer_part_no?: string | null;
}

interface CustomerItemFormBasicSectionProps {
  control: Control<CustomerItemFormData>;
  errors: FieldErrors<CustomerItemFormData>;
  isSubmitting: boolean;
  isLoading: boolean;
  customerOptions: Option[];
  productOptions: Option[];
  isLoadingCustomers: boolean;
  isLoadingProducts: boolean;
  onProductSelect: (value: string) => void;
}

// eslint-disable-next-line max-lines-per-function -- フォームセクションのため許容
export function CustomerItemFormBasicSection({
  control,
  errors,
  isSubmitting,
  isLoading,
  customerOptions,
  productOptions,
  isLoadingCustomers,
  isLoadingProducts,
  onProductSelect,
}: CustomerItemFormBasicSectionProps) {
  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-2 text-sm font-semibold text-slate-700">基本情報</legend>
      <div className="space-y-4">
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
                onChange={onProductSelect}
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

        {/* Pack Unit & Quantity */}
        <div className="grid grid-cols-2 gap-4">
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
                  placeholder="オプション"
                  disabled={isSubmitting}
                  maxLength={20}
                />
              )}
            />
          </div>
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
                  placeholder="オプション"
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
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
                rows={2}
                className="w-full rounded-md border px-3 py-2 text-sm"
                disabled={isSubmitting}
              />
            )}
          />
        </div>
      </div>
    </fieldset>
  );
}
