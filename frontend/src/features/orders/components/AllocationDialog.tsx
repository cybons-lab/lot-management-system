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
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";

interface AllocationDialogProps {
  /** 選択中の明細行（null でダイアログを閉じる） */
  line: OrderLine | null;
  /** ダイアログを閉じる際のコールバック */
  onClose: () => void;
  /** 引当成功時のコールバック */
  onSuccess?: () => void;
}

function AllocationErrorDialog({
  open,
  onClose,
  error,
  refetch,
}: {
  open: boolean;
  onClose: () => void;
  error: unknown;
  refetch: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>エラー</DialogTitle>
          <DialogDescription className="sr-only">データの取得に失敗しました</DialogDescription>
        </DialogHeader>
        <QueryErrorFallback
          error={error}
          resetError={refetch}
          title="受注データの取得に失敗しました"
        />
      </DialogContent>
    </Dialog>
  );
}

function AllocationContentDialog({
  line,
  order,
  onClose,
  allocation,
}: {
  line: OrderLine;
  order: OrderWithLinesResponse | undefined;
  onClose: () => void;
  allocation: ReturnType<typeof useOrderLineAllocation>;
}) {
  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
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
            candidateLots={allocation.candidateLots}
            lotAllocations={allocation.lotAllocations}
            onLotAllocationChange={allocation.changeAllocation}
            onAutoAllocate={allocation.autoAllocate}
            onClearAllocations={allocation.clearAllocations}
            onSaveAllocations={allocation.saveAllocations}
            onSaveAndConfirm={allocation.saveAndConfirmAllocations}
            onConfirmHard={allocation.confirmAllocations}
            onCancelAllocations={allocation.cancelAllAllocations}
            isLoading={allocation.isLoadingCandidates}
            isSaving={allocation.isSaving}
            canSave={Object.keys(allocation.lotAllocations).length > 0}
            isActive
            hardAllocated={allocation.hardAllocated}
            softAllocated={allocation.softAllocated}
            hasUnsavedChanges={allocation.hasUnsavedChanges}
            allocationState={allocation.allocationState}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AllocationDialog({ line, onClose, onSuccess }: AllocationDialogProps) {
  const {
    data: order,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["order", line?.order_id],
    queryFn: () => ordersApi.getOrder(line!.order_id),
    enabled: !!line?.order_id,
  });

  const allocation = useOrderLineAllocation({
    orderLine: line,
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  if (!line) return null;
  if (isError)
    return (
      <AllocationErrorDialog open={!!line} onClose={onClose} error={error} refetch={refetch} />
    );
  return (
    <AllocationContentDialog line={line} order={order} onClose={onClose} allocation={allocation} />
  );
}
