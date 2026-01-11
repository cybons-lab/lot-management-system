/**
 * WithdrawalCancelDialog
 *
 * 出庫取消ダイアログ
 */

import { useState } from "react";
import { Loader2, XCircle } from "lucide-react";

import {
  CANCEL_REASONS,
  type WithdrawalCancelReason,
  type WithdrawalResponse,
} from "../api";
import { useWithdrawals } from "../hooks";

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
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
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

      toast({
        title: "出庫を取り消しました",
        description: `ロット ${withdrawal.lot_number} の在庫が復元されました`,
      });

      onOpenChange(false);
      setReason("input_error");
      setNote("");
    } catch (error) {
      toast({
        title: "取消に失敗しました",
        description: error instanceof Error ? error.message : "エラーが発生しました",
        variant: "destructive",
      });
    }
  };

  if (!withdrawal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            出庫の取消
          </DialogTitle>
          <DialogDescription>
            この出庫を取り消すと、ロットの在庫が復元されます。
          </DialogDescription>
        </DialogHeader>

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
              onValueChange={(value) => setReason(value as WithdrawalCancelReason)}
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
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
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
