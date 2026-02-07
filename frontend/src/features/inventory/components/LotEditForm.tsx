/**
 * LotEditForm.tsx
 *
 * ロット編集フォームコンポーネント
 */

import { LotEditFields } from "./LotEditFields";

import { Button } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";

/**
 * ロット更新データの型定義
 *
 * IMPORTANT: 数量フィールドは含まない
 * - 数量の変更は入出庫操作を通してのみ行う
 */
export interface LotUpdateData {
  supplier_code?: string;
  delivery_place_code?: string;
  // quantity: Removed - use intake/withdrawal operations
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
      // quantity: Removed - quantity changes only through intake/withdrawal operations
      lot_unit: formData.get("lot_unit") as string,
      receipt_date: formData.get("receipt_date") as string,
      ...(formData.get("expiry_date")
        ? { expiry_date: formData.get("expiry_date") as string }
        : {}),
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
