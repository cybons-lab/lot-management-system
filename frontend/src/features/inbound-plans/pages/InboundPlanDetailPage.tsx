/**
 * InboundPlanDetailPage (v2.2 - Refactored)
 * Inbound plan detail page with receive functionality
 */
import { Pencil } from "lucide-react";

import { InboundPlanEditDialog } from "../components/InboundPlanEditDialog";
import { InboundPlanInfoCard } from "../components/InboundPlanInfoCard";
import { InboundPlanLinesTable } from "../components/InboundPlanLinesTable";
import { InboundReceiveDialog } from "../components/InboundReceiveDialog";
import { useInboundPlanDetail } from "../hooks/useInboundPlanDetail";

import { Button } from "@/components/ui";

export function InboundPlanDetailPage() {
  const {
    plan,
    isLoading,
    isError,
    isReceiveDialogOpen,
    setIsReceiveDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    handleBack,
    handleReceive,
    handleUpdate,
  } = useInboundPlanDetail();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          入荷予定の取得に失敗しました
        </div>
        <Button onClick={handleBack} className="mt-4">
          一覧に戻る
        </Button>
      </div>
    );
  }

  const canReceive = plan.status === "planned";
  const canEdit = plan.status === "planned";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">入荷予定詳細</h2>
          <p className="mt-1 text-gray-600">{plan.plan_number}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            一覧に戻る
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Button>
          )}
          {canReceive && <Button onClick={() => setIsReceiveDialogOpen(true)}>入庫確定</Button>}
        </div>
      </div>

      <InboundPlanInfoCard plan={plan} />

      <InboundPlanLinesTable lines={plan.lines || []} />

      {/* Receive Dialog */}
      <InboundReceiveDialog
        inboundPlan={plan}
        open={isReceiveDialogOpen}
        onOpenChange={setIsReceiveDialogOpen}
        onReceive={handleReceive}
      />

      {/* Edit Dialog */}
      <InboundPlanEditDialog
        plan={plan}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
