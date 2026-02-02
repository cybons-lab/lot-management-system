/**
 * AdhocLotCreateForm.tsx
 *
 * アドホックロット新規登録フォーム（受注非連動ロット用）
 * origin_type: sample, safety_stock, adhoc をサポート
 * react-hook-form + zodを使用した型安全なバリデーション
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  adhocLotCreateSchema,
  ADHOC_LOT_FORM_DEFAULTS,
  ADHOC_ORIGIN_TYPES,
  type AdhocLotFormData,
  type AdhocOriginType,
} from "./adhocLotCreateSchema";

// Re-export for backward compatibility
export { ADHOC_ORIGIN_TYPES, type AdhocOriginType };

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";

/**
 * アドホックロット作成データの型定義
 */
export interface AdhocLotCreateData {
  lot_number: string;
  supplier_item_id: number;
  warehouse_id: number;
  supplier_code?: string;
  received_date: string;
  expiry_date?: string;
  current_quantity: number;
  unit: string;
  origin_type: AdhocOriginType;
  origin_reference?: string;
  shipping_date?: string;
}

interface AdhocLotCreateFormProps {
  onSubmit: (data: AdhocLotCreateData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  /** 製品リスト */
  products: Array<{
    id: number;
    product_code: string;
    product_name: string;
    supplier_ids?: number[];
  }>;
  /** 倉庫リスト */
  warehouses: Array<{ id: number; warehouse_code: string; warehouse_name: string }>;
  /** 仕入先リスト */
  suppliers: Array<{ id: number; supplier_code: string; supplier_name: string }>;
}

/**
 * 入庫登録（旧アドホックロット作成）フォーム
 */
// eslint-disable-next-line max-lines-per-function -- Form component with many fields
export function AdhocLotCreateForm({
  onSubmit,
  onCancel,
  isSubmitting,
  products,
  warehouses,
  suppliers,
}: AdhocLotCreateFormProps) {
  // react-hook-form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors },
  } = useForm<AdhocLotFormData>({
    resolver: zodResolver(adhocLotCreateSchema),
    defaultValues: ADHOC_LOT_FORM_DEFAULTS,
  });

  // 監視対象のフィールド
  const selectedSupplier = watch("supplier_code");
  const selectedProduct = watch("supplier_item_id");
  const selectedWarehouse = watch("warehouse_id");

  // Filter products based on selected supplier
  const filteredProducts = useMemo(() => {
    if (!selectedSupplier || selectedSupplier === "none") {
      return products;
    }
    const supplierObj = suppliers.find((s) => s.supplier_code === selectedSupplier);
    if (!supplierObj) return products;

    return products.filter((product) => {
      return product.supplier_ids?.includes(supplierObj.id);
    });
  }, [products, selectedSupplier, suppliers]);

  // Reset product selection when supplier changes
  useEffect(() => {
    if (selectedProduct && filteredProducts.length > 0) {
      const exists = filteredProducts.find((p) => p.id.toString() === selectedProduct);
      if (!exists) {
        setValue("supplier_item_id", "");
      }
    }
  }, [selectedSupplier, filteredProducts, selectedProduct, setValue]);

  const onFormSubmit = async (data: AdhocLotFormData) => {
    const submitData: AdhocLotCreateData = {
      lot_number: data.lot_number,
      supplier_item_id: parseInt(data.supplier_item_id, 10),
      warehouse_id: parseInt(data.warehouse_id, 10),
      origin_type: data.origin_type,
      origin_reference: data.origin_reference || undefined,
      supplier_code:
        data.supplier_code && data.supplier_code !== "none" ? data.supplier_code : undefined,
      current_quantity: Number(data.current_quantity),
      unit: data.unit,
      received_date: data.received_date,
      expiry_date: data.expiry_date || undefined,
      shipping_date: data.shipping_date || undefined,
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">基本情報</h3>
        <p className="mt-1 text-sm text-slate-500">必須項目を先に入力してください。</p>
      </div>
      {/* Manual Lot Number Input */}
      <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
        ロット番号は手動で入力してください。
      </div>
      <div className="rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Row 0: Lot Number & Lot Type */}
          {/* Lot Number */}
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="lot_number">ロット番号 *</Label>
              <span className="text-xs text-slate-500">(例: LOT-2025-001)</span>
              <span className="text-xs font-medium text-red-500">必須</span>
            </div>
            <Input
              id="lot_number"
              {...register("lot_number")}
              placeholder=""
              className="font-mono"
            />
            {errors.lot_number && (
              <p className="mt-1 text-sm text-red-600">{errors.lot_number.message}</p>
            )}
          </div>

          {/* Lot Type */}
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="origin_type">ロット種別 *</Label>
              <span className="text-xs font-medium text-red-500">必須</span>
            </div>
            <Controller
              name="origin_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="種別を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADHOC_ORIGIN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Row 1: Supplier (Full Width) */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="supplier_code">仕入先（製品絞り込み）</Label>
              <span className="text-xs text-slate-400">任意</span>
            </div>
            <Controller
              name="supplier_code"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={[
                    { value: "none", label: "指定なし（全製品表示）" },
                    ...suppliers.map((supplier) => ({
                      value: supplier.supplier_code,
                      label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
                    })),
                  ]}
                  value={field.value ?? "none"}
                  onChange={field.onChange}
                  placeholder="仕入先を検索..."
                />
              )}
            />
          </div>

          {/* Row 2: Product & Warehouse */}
          {/* Product */}
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="supplier_item_id">製品 *</Label>
              <span className="text-xs font-medium text-red-500">必須</span>
            </div>
            <Controller
              name="supplier_item_id"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={filteredProducts.map((product) => ({
                    value: product.id.toString(),
                    label: `${product.product_code} - ${product.product_name}`,
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="製品を検索..."
                />
              )}
            />
            {selectedSupplier !== "none" && filteredProducts.length === 0 && (
              <p className="mt-1 text-xs text-red-500">
                この仕入先に関連付けられた製品はありません。
              </p>
            )}
            {errors.supplier_item_id && (
              <p className="mt-1 text-sm text-red-600">{errors.supplier_item_id.message}</p>
            )}
          </div>

          {/* Warehouse */}
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="warehouse_id">倉庫 *</Label>
              <span className="text-xs font-medium text-red-500">必須</span>
            </div>
            <Controller
              name="warehouse_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="倉庫を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {warehouse.warehouse_code} - {warehouse.warehouse_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.warehouse_id && (
              <p className="mt-1 text-sm text-red-600">{errors.warehouse_id.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">数量・単位</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Row 4: Quantity & Unit */}
          {/* 数量 */}
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="current_quantity">数量 *</Label>
              <span className="text-xs text-slate-500">(例: 1000)</span>
              <span className="text-xs font-medium text-red-500">必須</span>
            </div>
            <Input
              id="current_quantity"
              type="number"
              inputMode="decimal"
              {...register("current_quantity")}
              min="0"
              step="0.001"
              placeholder=""
            />
            {errors.current_quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.current_quantity.message}</p>
            )}
          </div>

          {/* 単位（コンボボックス） */}
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="unit">単位 *</Label>
              <span className="text-xs font-medium text-red-500">必須</span>
            </div>
            <Input id="unit" {...register("unit")} placeholder="例: EA" list="unit-options" />
            <datalist id="unit-options">
              <option value="EA" />
              <option value="KG" />
              <option value="CAN" />
            </datalist>
            {errors.unit && <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">日付・その他</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Row 5: Dates */}
          {/* 入荷日 */}
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="received_date">入荷日 *</Label>
              <span className="text-xs font-medium text-red-500">必須</span>
            </div>
            <Input id="received_date" type="date" {...register("received_date")} />
            {errors.received_date && (
              <p className="mt-1 text-sm text-red-600">{errors.received_date.message}</p>
            )}
          </div>

          {/* 有効期限 */}
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="expiry_date">有効期限</Label>
              <span className="text-xs text-slate-400">任意</span>
            </div>
            <Input id="expiry_date" type="date" {...register("expiry_date")} />
          </div>

          {/* 出荷予定日 */}
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="shipping_date">出荷予定日</Label>
              <span className="text-xs text-slate-400">任意</span>
            </div>
            <Input id="shipping_date" type="date" {...register("shipping_date")} />
          </div>
        </div>

        {/* 備考（origin_reference） */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="origin_reference">備考（参照情報）</Label>
            <span className="text-xs text-slate-400">任意</span>
          </div>
          <Input
            id="origin_reference"
            {...register("origin_reference")}
            placeholder="例: キャンペーン用サンプル、チケット#123"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting || !selectedProduct || !selectedWarehouse}>
          {isSubmitting ? "登録中..." : "入庫登録"}
        </Button>
      </div>
    </form>
  );
}
