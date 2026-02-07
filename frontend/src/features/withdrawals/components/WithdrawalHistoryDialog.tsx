/**
 * WithdrawalHistoryDialog
 *
 * 出庫履歴カレンダーダイアログ
 * - ロットごとの出庫履歴をカレンダー形式で表示
 * - 日付を選択して新規出庫を登録可能
 */
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { QuickWithdrawalDialog } from "./QuickWithdrawalDialog";
import { WithdrawalCalendar } from "./WithdrawalCalendar";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LotUI } from "@/shared/libs/normalize";

interface WithdrawalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: LotUI;
  onWithdrawalSuccess?: () => void;
}

export function WithdrawalHistoryDialog({
  open,
  onOpenChange,
  lot,
  onWithdrawalSuccess,
}: WithdrawalHistoryDialogProps) {
  const queryClient = useQueryClient();
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setWithdrawalDialogOpen(true);
  };

  const handleWithdrawalSuccess = () => {
    // カレンダーのデータを更新
    queryClient.invalidateQueries({ queryKey: ["withdrawals", "calendar", lot.id] });
    // ロットデータも更新
    queryClient.invalidateQueries({ queryKey: ["lots"] });
    // 親コンポーネントのコールバック
    onWithdrawalSuccess?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[85vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <span className="text-slate-800">出庫履歴カレンダー</span>
              <span className="rounded-md bg-slate-200 px-2 py-0.5 text-sm font-normal text-slate-600">
                {lot.lot_number}
              </span>
            </DialogTitle>
            <p className="mt-1 text-sm text-slate-500">
              {lot.product_name || lot.product_code} ・ 日付をクリックして新規出庫を登録できます
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-slate-50/30">
            <WithdrawalCalendar
              lotId={lot.id}
              onDateSelect={handleDateSelect}
              showWithdrawButton={true}
              {...(lot.warehouse_name ? { warehouseName: lot.warehouse_name } : {})}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 出庫登録ダイアログ */}
      <QuickWithdrawalDialog
        lot={lot}
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
        onSuccess={handleWithdrawalSuccess}
        {...(selectedDate ? { initialShipDate: selectedDate } : {})}
      />
    </>
  );
}
