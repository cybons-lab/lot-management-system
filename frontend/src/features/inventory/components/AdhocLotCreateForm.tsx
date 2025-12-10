/**
 * AdhocLotCreateForm.tsx
 *
 * アドホックロット新規登録フォーム（受注非連動ロット用）
 * origin_type: sample, safety_stock, adhoc をサポート
 */

import { useEffect, useMemo, useState } from "react";

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

/**
 * ロット起点タイプ（アドホック画面で選択可能な値のみ）
 */
export const ADHOC_ORIGIN_TYPES = [
  { value: "sample", label: "サンプル" },
  { value: "safety_stock", label: "安全在庫" },
  { value: "adhoc", label: "その他" },
] as const;

export type AdhocOriginType = (typeof ADHOC_ORIGIN_TYPES)[number]["value"];

/**
 * アドホックロット作成データの型定義
 */
export interface AdhocLotCreateData {
  lot_number: string;
  product_id: number;
  warehouse_id: number;
  supplier_code?: string;
  received_date: string;
  expiry_date?: string;
  current_quantity: number;
  unit: string;
  origin_type: AdhocOriginType;
  origin_reference?: string;
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
// eslint-disable-next-line max-lines-per-function
export function AdhocLotCreateForm({
  onSubmit,
  onCancel,
  isSubmitting,
  products,
  warehouses,
  suppliers,
}: AdhocLotCreateFormProps) {
  const [selectedOriginType, setSelectedOriginType] = useState<AdhocOriginType>("adhoc");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("none"); // Default to "none" (or empty)

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
        setSelectedProduct("");
      }
    }
  }, [selectedSupplier, filteredProducts, selectedProduct]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!selectedProduct || !selectedWarehouse) {
      return;
    }

    const data: AdhocLotCreateData = {
      lot_number: formData.get("lot_number") as string,
      product_id: parseInt(selectedProduct, 10),
      warehouse_id: parseInt(selectedWarehouse, 10),
      origin_type: selectedOriginType,
      origin_reference: (formData.get("origin_reference") as string) || undefined,
      supplier_code: selectedSupplier && selectedSupplier !== "none" ? selectedSupplier : undefined,
      current_quantity: Number(formData.get("current_quantity")),
      unit: formData.get("unit") as string,
      received_date: formData.get("received_date") as string,
      expiry_date: (formData.get("expiry_date") as string) || undefined,
    };

    await onSubmit(data);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      /* Manual Lot Number Input */
      <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
        ロット番号は手動で入力してください。
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Row 0: Lot Number */}
        <div className="col-span-2">
          <Label htmlFor="lot_number">ロット番号 *</Label>
          <Input
            id="lot_number"
            name="lot_number"
            required
            placeholder="例: LOT-2025-001"
            className="font-mono"
          />
        </div>

        {/* Row 1: Lot Type & Supplier */}
        {/* ロット種別 */}
        <div>
          <Label htmlFor="origin_type">ロット種別 *</Label>
          <Select
            value={selectedOriginType}
            onValueChange={(v) => setSelectedOriginType(v as AdhocOriginType)}
          >
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
        </div>

        {/* 仕入先（任意だが製品絞り込みに使用） */}
        <div>
          <Label htmlFor="supplier_code">仕入先（製品絞り込み）</Label>
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger>
              <SelectValue placeholder="仕入先を選択（任意）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">指定なし（全製品表示）</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.supplier_code}>
                  {supplier.supplier_code} - {supplier.supplier_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: Product & Warehouse */}
        {/* 製品選択 */}
        <div>
          <Label htmlFor="product_id">製品 *</Label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="製品を選択" />
            </SelectTrigger>
            <SelectContent>
              {filteredProducts.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.product_code} - {product.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSupplier !== "none" && filteredProducts.length === 0 && (
            <p className="mt-1 text-xs text-red-500">
              この仕入先に関連付けられた製品はありません。
            </p>
          )}
        </div>

        {/* 倉庫選択 */}
        <div>
          <Label htmlFor="warehouse_id">倉庫 *</Label>
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
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
        </div>

        {/* Row 3: Quantity & Unit */}
        {/* 数量 */}
        <div>
          <Label htmlFor="current_quantity">数量 *</Label>
          <Input
            id="current_quantity"
            name="current_quantity"
            type="number"
            required
            min="0"
            step="0.001"
            placeholder="例: 1000"
          />
        </div>

        {/* 単位（コンボボックス） */}
        <div>
          <Label htmlFor="unit">単位 *</Label>
          <Input
            id="unit"
            name="unit"
            required
            placeholder="例: EA"
            defaultValue="EA"
            list="unit-options"
          />
          <datalist id="unit-options">
            <option value="EA" />
            <option value="KG" />
            <option value="CAN" />
          </datalist>
        </div>

        {/* Row 4: Dates */}
        {/* 入荷日 */}
        <div>
          <Label htmlFor="received_date">入荷日 *</Label>
          <Input
            id="received_date"
            name="received_date"
            type="date"
            required
            defaultValue={today}
          />
        </div>

        {/* 有効期限 */}
        <div>
          <Label htmlFor="expiry_date">有効期限</Label>
          <Input id="expiry_date" name="expiry_date" type="date" />
        </div>

        {/* Row 5: Reference */}
        {/* 備考（origin_reference） */}
        <div className="col-span-2">
          <Label htmlFor="origin_reference">備考（参照情報）</Label>
          <Input
            id="origin_reference"
            name="origin_reference"
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
