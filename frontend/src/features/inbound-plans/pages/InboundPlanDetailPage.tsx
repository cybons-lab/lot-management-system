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
import { PageContainer, PageHeader } from "@/shared/components/layout";

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
      <PageContainer>
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      </PageContainer>
    );
  }

  if (isError || !plan) {
    return (
      <PageContainer>
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          入荷予定の取得に失敗しました
        </div>
        <Button onClick={handleBack} className="mt-4">
          一覧に戻る
        </Button>
      </PageContainer>
    );
  }

  const canReceive = plan.status === "planned";
  const canEdit = plan.status === "planned";

  return (
    <PageContainer>
      <PageHeader
        title="入荷予定詳細"
        subtitle={plan.plan_number}
        actions={
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
        }
        className="pb-0"
      />

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
    </PageContainer>
  );
}
