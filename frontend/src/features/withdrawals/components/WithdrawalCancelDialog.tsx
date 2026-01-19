/**
 * WithdrawalCancelDialog
 *
 * 出庫取消ダイアログ
 */

import { Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { type WithdrawalCancelReason, type WithdrawalResponse } from "../api";
import { useWithdrawals } from "../hooks";

import { WithdrawalCancelForm } from "./WithdrawalCancelForm";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

interface WithdrawalCancelDialogProps {
  withdrawal: WithdrawalResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawalCancelDialog({
  withdrawal,
  open,
  onOpenChange,
}: WithdrawalCancelDialogProps) {
  /* const { toast } = useToast(); */
  const { useCancel } = useWithdrawals();
  const cancelMutation = useCancel();

  const [reason, setReason] = useState<WithdrawalCancelReason>("input_error");
  const [note, setNote] = useState("");

  const handleCancel = async () => {
    if (!withdrawal) return;

    try {
      await cancelMutation.mutateAsync({
        withdrawalId: withdrawal.withdrawal_id,
        data: {
          reason,
          note: note.trim() || null,
        },
      });

      toast.success("出庫を取り消しました", {
        description: `ロット ${withdrawal.lot_number} の在庫が復元されました`,
      });

      onOpenChange(false);
      setReason("input_error");
      setNote("");
    } catch (error) {
      toast.error("取消に失敗しました", {
        description: error instanceof Error ? error.message : "エラーが発生しました",
      });
    }
  };

  if (!withdrawal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            出庫の取消
          </DialogTitle>
          <DialogDescription>この出庫を取り消すと、ロットの在庫が復元されます。</DialogDescription>
        </DialogHeader>

        <WithdrawalCancelForm
          withdrawal={withdrawal}
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
