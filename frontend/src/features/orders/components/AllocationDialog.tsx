/**
 * AllocationDialog.tsx
 *
 * 受注明細に対するロット引当操作を行うダイアログ
 * OrderDetailPage から抽出し、受注一覧画面からも直接利用可能にした
 */

import { useQuery } from "@tanstack/react-query";

import { useOrderLineAllocation } from "../hooks/useOrderLineAllocation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { LotAllocationPanel } from "@/features/allocations/components/lots/LotAllocationPanel";
import * as ordersApi from "@/features/orders/api";
import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";

interface AllocationDialogProps {
  /** 選択中の明細行（null でダイアログを閉じる） */
  line: OrderLine | null;
  /** ダイアログを閉じる際のコールバック */
  onClose: () => void;
  /** 引当成功時のコールバック */
  onSuccess?: () => void;
}

export function AllocationDialog({ line, onClose, onSuccess }: AllocationDialogProps) {
  // 親受注の情報を取得（LotAllocationPanel に必要）
  const { data: order } = useQuery({
    queryKey: ["order", line?.order_id],
    queryFn: () => ordersApi.getOrder(line!.order_id),
    enabled: !!line?.order_id,
  });

  const {
    candidateLots,
    lotAllocations,
    hardAllocated,
    softAllocated,
    hasUnsavedChanges,
    allocationState,
    isLoadingCandidates,
    isSaving,
    changeAllocation,
    clearAllocations,
    autoAllocate,
    saveAllocations,
    saveAndConfirmAllocations,
    confirmAllocations,
    cancelAllAllocations,
  } = useOrderLineAllocation({
    orderLine: line,
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  if (!line) return null;

  return (
    <Dialog open={!!line} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0">
        <DialogHeader className="px-6 py-4">
          <DialogTitle>ロット引当</DialogTitle>
          <DialogDescription className="sr-only">
            受注明細に対するロット引当を行います。
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0">
          <LotAllocationPanel
            order={order as OrderWithLinesResponse}
            orderLine={line}
            candidateLots={candidateLots}
            lotAllocations={lotAllocations}
            onLotAllocationChange={changeAllocation}
            onAutoAllocate={autoAllocate}
            onClearAllocations={clearAllocations}
            onSaveAllocations={saveAllocations}
            onSaveAndConfirm={saveAndConfirmAllocations}
            onConfirmHard={confirmAllocations}
            onCancelAllocations={cancelAllAllocations}
            isLoading={isLoadingCandidates}
            isSaving={isSaving}
            canSave={Object.keys(lotAllocations).length > 0}
            isActive={true}
            hardAllocated={hardAllocated}
            softAllocated={softAllocated}
            hasUnsavedChanges={hasUnsavedChanges}
            allocationState={allocationState}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
