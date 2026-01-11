/**
 * ReservationCancelDialog
 *
 * CONFIRMED予約の取消ダイアログ（反対仕訳方式）
 */

import { Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { type ReservationCancelReason } from "../api";
import { useCancelReservationMutation } from "../hooks/mutations";
import { type ReservationInfo } from "../types";

import { ReservationCancelForm } from "./ReservationCancelForm";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

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

        <ReservationCancelForm
          reservation={reservation}
          reason={reason}
          onReasonChange={setReason}
          note={note}
          onNoteChange={setNote}
        />

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
