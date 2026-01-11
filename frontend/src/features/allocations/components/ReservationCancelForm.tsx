import { RESERVATION_CANCEL_REASONS, type ReservationCancelReason } from "../api";

import { type ReservationInfo } from "./ReservationCancelDialog";

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";

interface ReservationCancelFormProps {
  reservation: ReservationInfo;
  reason: ReservationCancelReason;
  onReasonChange: (value: ReservationCancelReason) => void;
  note: string;
  onNoteChange: (value: string) => void;
}

export function ReservationCancelForm({
  reservation,
  reason,
  onReasonChange,
  note,
  onNoteChange,
}: ReservationCancelFormProps) {
  return (
    <div className="space-y-4 py-4">
      {/* 対象予約の情報 */}
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          {reservation.lot_number && (
            <div>
              <span className="text-slate-500">ロット:</span>{" "}
              <span className="font-mono font-medium">{reservation.lot_number}</span>
            </div>
          )}
          {reservation.reserved_qty !== undefined && (
            <div>
              <span className="text-slate-500">数量:</span>{" "}
              <span className="font-medium">{reservation.reserved_qty}</span>
            </div>
          )}
          {reservation.product_name && (
            <div className="col-span-2">
              <span className="text-slate-500">製品:</span>{" "}
              <span className="font-medium">{reservation.product_name}</span>
            </div>
          )}
          {reservation.order_number && (
            <div className="col-span-2">
              <span className="text-slate-500">受注番号:</span>{" "}
              <span className="font-medium">{reservation.order_number}</span>
            </div>
          )}
          {reservation.status && (
            <div className="col-span-2">
              <span className="text-slate-500">ステータス:</span>{" "}
              <span className="font-medium">{reservation.status}</span>
            </div>
          )}
        </div>
      </div>

      {/* 取消理由の選択 */}
      <div className="space-y-2">
        <Label htmlFor="cancel-reason">取消理由 *</Label>
        <Select
          value={reason}
          onValueChange={(value) => onReasonChange(value as ReservationCancelReason)}
        >
          <SelectTrigger id="cancel-reason">
            <SelectValue placeholder="理由を選択" />
          </SelectTrigger>
          <SelectContent>
            {RESERVATION_CANCEL_REASONS.map((r) => (
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
