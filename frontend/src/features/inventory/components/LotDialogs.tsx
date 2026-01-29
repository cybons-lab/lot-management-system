import { LotCreateForm } from "@/features/inventory/components/LotCreateForm";
import { LotEditForm, type LotUpdateData } from "@/features/inventory/components/LotEditForm";
import { LotLockDialog } from "@/features/inventory/components/LotLockDialog";
import type { useLotListLogic } from "@/features/inventory/hooks/useLotListLogic";
import { FormDialog } from "@/shared/components/form";

interface LotDialogsProps {
  logic: ReturnType<typeof useLotListLogic>;
}

export function LotDialogs({ logic }: LotDialogsProps) {
  return (
    <>
      {/* 新規登録ダイアログ */}
      <FormDialog
        open={logic.createDialog.isOpen}
        onClose={logic.createDialog.close}
        title="ロット新規登録"
        description="新しいロットを登録します"
        size="lg"
      >
        <LotCreateForm
          onSubmit={async (data) => {
            await logic.createLotMutation.mutateAsync(
              data as Parameters<typeof logic.createLotMutation.mutateAsync>[0],
            );
          }}
          onCancel={logic.createDialog.close}
          isSubmitting={logic.createLotMutation.isPending}
        />
      </FormDialog>

      {/* 編集・ロックダイアログ */}
      {logic.selectedLot && (
        <>
          <FormDialog
            open={logic.editDialog.isOpen}
            onClose={() => {
              logic.editDialog.close();
              logic.setSelectedLot(null);
            }}
            title="ロット編集"
            description={`ロット ${logic.selectedLot.lot_number || "-"} を編集します`}
            size="lg"
          >
            <LotEditForm
              initialData={logic.selectedLot}
              onSubmit={async (data: LotUpdateData) => {
                await logic.updateLotMutation.mutateAsync(data);
              }}
              onCancel={() => {
                logic.editDialog.close();
                logic.setSelectedLot(null);
              }}
              isSubmitting={logic.updateLotMutation.isPending}
            />
          </FormDialog>

          <LotLockDialog
            open={logic.lockDialog.isOpen}
            onClose={() => {
              logic.lockDialog.close();
              logic.setSelectedLot(null);
            }}
            onConfirm={async (reason, quantity) => {
              await logic.lockLotMutation.mutateAsync({
                id: logic.selectedLot!.id,
                reason,
                quantity,
              });
            }}
            isSubmitting={logic.lockLotMutation.isPending}
            lotNumber={logic.selectedLot.lot_number || "-"}
            availableQuantity={
              Number(logic.selectedLot.current_quantity) -
              Number(logic.selectedLot.allocated_quantity) -
              Number(logic.selectedLot.locked_quantity || 0)
            }
          />
        </>
      )}
    </>
  );
}
