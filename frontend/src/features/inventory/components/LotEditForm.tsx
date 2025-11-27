/**
 * LotEditForm.tsx
 *
 * ロット編集フォームコンポーネント
 */

import { Button } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";
import { LotEditFields } from "./LotEditFields";

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


