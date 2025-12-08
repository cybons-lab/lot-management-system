/**
 * AdhocLotCreateForm.tsx
 *
 * アドホックロット新規登録フォーム（受注非連動ロット用）
 * origin_type: sample, safety_stock, adhoc をサポート
 */

import { useState } from "react";

import { Button, Input, Label } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";

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
  lot_number: string; // "AUTO" で自動採番
  product_id: number;
  warehouse_id: number;
  origin_type: AdhocOriginType;
  origin_reference?: string;
  supplier_code?: string; // 任意
  current_quantity: number;
  unit: string;
  received_date: string;
  expiry_date?: string;
}

interface AdhocLotCreateFormProps {
  /** フォーム送信ハンドラ */
  onSubmit: (data: AdhocLotCreateData) => Promise<void>;
  /** キャンセルハンドラ */
  onCancel: () => void;
  /** 送信中状態 */
  isSubmitting: boolean;
  /** 製品リスト */
  products: Array<{ id: number; product_code: string; product_name: string }>;
  /** 倉庫リスト */
  warehouses: Array<{ id: number; warehouse_code: string; warehouse_name: string }>;
}

/**
 * アドホックロット新規登録フォーム
 */
// eslint-disable-next-line max-lines-per-function -- Form component with many fields
export function AdhocLotCreateForm({
  onSubmit,
  onCancel,
  isSubmitting,
  products,
  warehouses,
}: AdhocLotCreateFormProps) {
  const [selectedOriginType, setSelectedOriginType] = useState<AdhocOriginType>("adhoc");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!selectedProduct || !selectedWarehouse) {
      return;
    }

    const data: AdhocLotCreateData = {
      lot_number: "AUTO", // 自動採番
      product_id: parseInt(selectedProduct, 10),
      warehouse_id: parseInt(selectedWarehouse, 10),
      origin_type: selectedOriginType,
      origin_reference: (formData.get("origin_reference") as string) || undefined,
      supplier_code: (formData.get("supplier_code") as string) || undefined,
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
      <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
        ロット番号は自動的に生成されます（例: SMP-20251208-0001）
      </div>

      <div className="grid grid-cols-2 gap-4">
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

        {/* 製品選択 */}
        <div>
          <Label htmlFor="product_id">製品 *</Label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="製品を選択" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.product_code} - {product.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* 仕入先（任意） */}
        <div>
          <Label htmlFor="supplier_code">仕入先コード（任意）</Label>
          <Input id="supplier_code" name="supplier_code" placeholder="例: S001" />
        </div>

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

        {/* 単位 */}
        <div>
          <Label htmlFor="unit">単位 *</Label>
          <Input id="unit" name="unit" required placeholder="例: EA" defaultValue="EA" />
        </div>

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
          {isSubmitting ? "作成中..." : "アドホックロット作成"}
        </Button>
      </div>
    </form>
  );
}
