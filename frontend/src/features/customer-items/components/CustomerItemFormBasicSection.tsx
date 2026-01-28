/**
 * CustomerItemFormBasicSection
 * 得意先品番の基本情報セクション（フォーム用）
 * Phase1対応: supplier_item_id を必須に変更
 */

import { AlertCircle } from "lucide-react";
import { type Control, Controller, type FieldErrors } from "react-hook-form";

import type { CustomerItemFormData } from "./customerItemFormSchema";

import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
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
  productOptions: Option[]; // Phase1: product_group_id はオプション
  supplierItemOptions?: Option[]; // Phase1: supplier_item_id 選択用（必須）
  isLoadingCustomers: boolean;
  isLoadingProducts: boolean;
  isLoadingSupplierItems?: boolean; // Phase1用
  onProductSelect: (value: string) => void;
  onSupplierItemSelect?: (value: string) => void; // Phase1用
}

// eslint-disable-next-line max-lines-per-function -- フォームセクションのため許容
export function CustomerItemFormBasicSection({
  control,
  errors,
  isSubmitting,
  isLoading,
  customerOptions,
  productOptions,
  supplierItemOptions = [],
  isLoadingCustomers,
  isLoadingProducts,
  isLoadingSupplierItems = false,
  onProductSelect,
  onSupplierItemSelect,
}: CustomerItemFormBasicSectionProps) {
  // Phase1: supplier_item_id が未設定かチェック（警告表示用）
  // Note: この機能は一時的に無効化（react-hook-formのAPIアクセスパターン変更のため）
  // const [isSupplierItemMissing, setIsSupplierItemMissing] = React.useState(false);
  const isSupplierItemMissing = false; // TODO: watch()を使用した実装に変更
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
                value={field.value ? String(field.value) : undefined}
                onChange={(value) => field.onChange(value && value !== "" ? Number(value) : 0)}
                placeholder={isLoadingCustomers ? "読込中..." : "得意先を検索..."}
                disabled={isSubmitting || isLoading}
              />
            )}
          />
          {errors.customer_id && (
            <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
          )}
        </div>

        {/* 得意先品番（手入力） */}
        <div>
          <Label htmlFor="customer_part_no" className="mb-2 block text-sm font-medium">
            得意先品番 <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="customer_part_no"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="customer_part_no"
                type="text"
                placeholder="得意先での品番を入力"
                disabled={isSubmitting}
                maxLength={100}
              />
            )}
          />
          {errors.customer_part_no && (
            <p className="mt-1 text-sm text-red-600">{errors.customer_part_no.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            得意先が使用する品番（先方で呼ばれている品番）
          </p>
        </div>

        {/* メーカー品番選択 (Phase1: supplier_item_id) */}
        <div>
          <Label htmlFor="supplier_item_id" className="mb-2 block text-sm font-medium">
            メーカー品番 <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="supplier_item_id"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                options={supplierItemOptions}
                value={field.value ? String(field.value) : undefined}
                onChange={(value) => {
                  field.onChange(value ? Number(value) : 0);
                  if (onSupplierItemSelect) {
                    onSupplierItemSelect(value);
                  }
                }}
                placeholder={isLoadingSupplierItems ? "読込中..." : "メーカー品番を検索..."}
                disabled={isSubmitting || isLoading}
              />
            )}
          />
          {errors.supplier_item_id && (
            <p className="mt-1 text-sm text-red-600">{errors.supplier_item_id.message}</p>
          )}
          <p className="mt-1 text-xs text-amber-600">
            ⚠️ Phase1必須:
            メーカー品番の設定は必須です。設定しない場合、出荷処理がブロックされます。
          </p>
          {isSupplierItemMissing && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                メーカー品番の設定は必須です。設定しない場合、この得意先品番での出荷処理がブロックされます。
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* 商品構成 (Phase1: オプション、Phase2用) */}
        <div>
          <Label htmlFor="product_group_id" className="mb-2 block text-sm font-medium">
            商品構成 <span className="text-gray-400">(オプション)</span>
          </Label>
          <Controller
            name="product_group_id"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                options={productOptions}
                value={field.value ? String(field.value) : undefined}
                onChange={onProductSelect}
                placeholder={isLoadingProducts ? "読込中..." : "商品構成を選択（Phase2用）"}
                disabled={isSubmitting || isLoading}
              />
            )}
          />
          {errors.product_group_id && (
            <p className="mt-1 text-sm text-red-600">{errors.product_group_id.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Phase1では省略可能。複数メーカー品番をまとめる場合のみ設定（Phase2機能）。
          </p>
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
