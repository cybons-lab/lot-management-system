/**
 * LotEditForm.tsx
 *
 * ロット編集フォームコンポーネント
 */

import { Button, Input, Label } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";

/**
 * ロット更新データの型定義
 */
export interface LotUpdateData {
  supplier_code?: string;
  delivery_place_code?: string;
  quantity?: number;
  lot_unit?: string;
  receipt_date?: string;
  expiry_date?: string;
}

interface LotEditFormProps {
  /** 編集対象のロットデータ */
  initialData: LotUI;
  /** フォーム送信ハンドラ */
  onSubmit: (data: LotUpdateData) => Promise<void>;
  /** キャンセルハンドラ */
  onCancel: () => void;
  /** 送信中状態 */
  isSubmitting: boolean;
}

/**
 * ロット編集フォーム
 */
export function LotEditForm({ initialData, onSubmit, onCancel, isSubmitting }: LotEditFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: LotUpdateData = {
      // supplier_code: formData.get("supplier_code") as string, // 今回は更新対象外とする（ID管理のため複雑になる）
      // delivery_place_code: formData.get("delivery_place_code") as string,
      quantity: Number(formData.get("quantity")),
      lot_unit: formData.get("lot_unit") as string,
      receipt_date: formData.get("receipt_date") as string,
      expiry_date: (formData.get("expiry_date") as string) || undefined,
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <LotEditFields initialData={initialData} />

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "更新中..." : "更新"}
        </Button>
      </div>
    </form>
  );
}

function LotEditFields({ initialData }: { initialData: LotUI }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="lot_number">ロット番号</Label>
        <Input
          id="lot_number"
          name="lot_number"
          defaultValue={initialData.lot_number}
          disabled
          className="bg-gray-100"
        />
      </div>

      <div>
        <Label htmlFor="product_code">製品コード</Label>
        <Input
          id="product_code"
          name="product_code"
          defaultValue={initialData.product_code ?? ""}
          disabled
          className="bg-gray-100"
        />
      </div>

      <div>
        <Label htmlFor="supplier_name">仕入先</Label>
        <Input
          id="supplier_name"
          name="supplier_name"
          defaultValue={initialData.supplier_name ?? ""}
          disabled
          className="bg-gray-100"
        />
      </div>

      <div>
        <Label htmlFor="warehouse_name">倉庫</Label>
        <Input
          id="warehouse_name"
          name="warehouse_name"
          defaultValue={initialData.warehouse_name ?? ""}
          disabled
          className="bg-gray-100"
        />
      </div>

      <div>
        <Label htmlFor="quantity">現在数量</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          required
          min="0"
          step="0.001"
          defaultValue={initialData.current_quantity}
        />
      </div>

      <div>
        <Label htmlFor="lot_unit">単位</Label>
        <Input id="lot_unit" name="lot_unit" required defaultValue={initialData.unit} />
      </div>

      <div>
        <Label htmlFor="receipt_date">入荷日</Label>
        <Input
          id="receipt_date"
          name="receipt_date"
          type="date"
          required
          defaultValue={initialData.received_date}
        />
      </div>

      <div>
        <Label htmlFor="expiry_date">有効期限</Label>
        <Input
          id="expiry_date"
          name="expiry_date"
          type="date"
          defaultValue={initialData.expiry_date ?? ""}
        />
      </div>
    </div>
  );
}
