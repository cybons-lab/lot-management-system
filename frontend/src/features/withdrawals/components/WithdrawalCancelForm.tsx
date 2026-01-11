import { CANCEL_REASONS, type WithdrawalCancelReason, type WithdrawalResponse } from "../api";

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";

interface WithdrawalCancelFormProps {
  withdrawal: WithdrawalResponse;
  reason: WithdrawalCancelReason;
  onReasonChange: (value: WithdrawalCancelReason) => void;
  note: string;
  onNoteChange: (value: string) => void;
}

export function WithdrawalCancelForm({
  withdrawal,
  reason,
  onReasonChange,
  note,
  onNoteChange,
}: WithdrawalCancelFormProps) {
  return (
    <div className="space-y-4 py-4">
      {/* 対象出庫の情報 */}
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-500">ロット:</span>{" "}
            <span className="font-mono font-medium">{withdrawal.lot_number}</span>
          </div>
          <div>
            <span className="text-slate-500">数量:</span>{" "}
            <span className="font-medium">{withdrawal.quantity}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">製品:</span>{" "}
            <span className="font-medium">{withdrawal.product_name}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">出庫タイプ:</span>{" "}
            <span className="font-medium">{withdrawal.withdrawal_type_label}</span>
          </div>
        </div>
      </div>

      {/* 取消理由の選択 */}
      <div className="space-y-2">
        <Label htmlFor="cancel-reason">取消理由 *</Label>
        <Select
          value={reason}
          onValueChange={(value) => onReasonChange(value as WithdrawalCancelReason)}
        >
          <SelectTrigger id="cancel-reason">
            <SelectValue placeholder="理由を選択" />
          </SelectTrigger>
          <SelectContent>
            {CANCEL_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* メモ（任意） */}
      <div className="space-y-2">
        <Label htmlFor="cancel-note">メモ（任意）</Label>
        <Textarea
          id="cancel-note"
          placeholder="取消の詳細を入力..."
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
