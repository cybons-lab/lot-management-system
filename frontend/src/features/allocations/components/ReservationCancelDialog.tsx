/**
 * ReservationCancelDialog
 *
 * CONFIRMED予約の取消ダイアログ（反対仕訳方式）
 */

import { useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { RESERVATION_CANCEL_REASONS, type ReservationCancelReason } from "../api";
import { useCancelReservationMutation } from "../hooks/mutations";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";

export interface ReservationInfo {
  id: number;
  lot_id?: number | null;
  lot_number?: string | null;
  reserved_qty?: number | string;
  product_name?: string | null;
  product_code?: string | null;
  order_number?: string | null;
  status?: string;
}

interface ReservationCancelDialogProps {
  reservation: ReservationInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReservationCancelDialog({
  reservation,
  open,
  onOpenChange,
  onSuccess,
}: ReservationCancelDialogProps) {
  /* const { toast } = useToast(); */

  const [reason, setReason] = useState<ReservationCancelReason>("input_error");
  const [note, setNote] = useState("");

  const cancelMutation = useCancelReservationMutation({
    onSuccess: (response) => {
      toast.success("予約を取り消しました", {
        description: response.lot_number
          ? `ロット ${response.lot_number} の引当が解除されました`
          : "引当が解除されました",
      });

      onOpenChange(false);
      setReason("input_error");
      setNote("");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("取消に失敗しました", {
        description: error instanceof Error ? error.message : "エラーが発生しました",
      });
    },
  });

  const handleCancel = async () => {
    if (!reservation) return;

    cancelMutation.mutate({
      allocationId: reservation.id,
      data: {
        reason,
        note: note.trim() || null,
      },
    });
  };

  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            引当の取消
          </DialogTitle>
          <DialogDescription>
            この確定引当を取り消します。在庫履歴に反対仕訳が記録されます。
          </DialogDescription>
        </DialogHeader>

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
              onValueChange={(value) => setReason(value as ReservationCancelReason)}
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
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelMutation.isPending}
          >
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              "取り消す"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
