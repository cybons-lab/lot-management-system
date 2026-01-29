/**
 * LotCreateForm.tsx
 *
 * ロット新規登録フォームコンポーネント
 */

import { Button, Input, Label } from "@/components/ui";

/**
 * ロット作成データの型定義
 */
export interface LotCreateData {
  lot_number: string;
  product_code: string;
  supplier_code: string;
  delivery_place_code?: string;
  delivery_place_name?: string;
  quantity: number;
  lot_unit: string;
  receipt_date: string;
  expiry_date?: string;
  origin_reference?: string; // 入庫No
}

interface LotCreateFormProps {
  /** フォーム送信ハンドラ */
  onSubmit: (data: LotCreateData) => Promise<void>;
  /** キャンセルハンドラ */
  onCancel: () => void;
  /** 送信中状態 */
  isSubmitting: boolean;
}

/**
 * ロット新規登録フォーム
 */
export function LotCreateForm({ onSubmit, onCancel, isSubmitting }: LotCreateFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: LotCreateData = {
      lot_number: formData.get("lot_number") as string,
      product_code: formData.get("product_code") as string,
      supplier_code: formData.get("supplier_code") as string,
      delivery_place_code: (formData.get("delivery_place_code") as string) || undefined,
      delivery_place_name: (formData.get("delivery_place_name") as string) || undefined,
      quantity: Number(formData.get("quantity")),
      lot_unit: formData.get("lot_unit") as string,
      receipt_date: formData.get("receipt_date") as string,
      expiry_date: (formData.get("expiry_date") as string) || undefined,
      origin_reference: (formData.get("origin_reference") as string) || undefined,
    };
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormFields />
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "作成中..." : "作成"}
        </Button>
      </div>
    </form>
  );
}

function FormFields() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="ロット番号" id="lot_number" placeholder="未確定の場合は空欄" />
      <Field label="入庫No" id="origin_reference" placeholder="例: IB-2024-001" />
      <Field label="メーカー品番 *" id="product_code" required placeholder="例: P001" />
      <Field label="仕入先コード *" id="supplier_code" required placeholder="例: S001" />
      <Field label="納品先コード" id="delivery_place_code" placeholder="例: DP-001" />
      <Field label="納品先名" id="delivery_place_name" placeholder="例: 東京倉庫" />
      <Field
        label="数量 *"
        id="quantity"
        type="number"
        required
        min="0"
        step="0.01"
        placeholder="例: 1000"
      />
      <Field label="単位 *" id="lot_unit" required placeholder="例: EA" defaultValue="EA" />
      <Field label="入荷日 *" id="receipt_date" type="date" required />
      <Field label="有効期限" id="expiry_date" type="date" />
    </div>
  );
}

function Field({
  label,
  id,
  ...props
}: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...props} />
    </div>
  );
}
