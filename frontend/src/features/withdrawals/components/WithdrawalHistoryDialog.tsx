import { WithdrawalCalendar } from "./WithdrawalCalendar";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LotUI } from "@/shared/libs/normalize";

interface WithdrawalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: LotUI;
}

export function WithdrawalHistoryDialog({ open, onOpenChange, lot }: WithdrawalHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>出庫履歴カレンダー (ロット番号: {lot.lot_number})</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          <WithdrawalCalendar lotId={lot.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
