import { LotEditForm, type LotUpdateData } from "@/features/inventory/components/LotEditForm";
import { LotLockDialog } from "@/features/inventory/components/LotLockDialog";
import { type useInventoryTableLogic } from "@/features/inventory/hooks/useInventoryTableLogic";
import { FormDialog } from "@/shared/components/form";
import { calculateAvailable } from "@/shared/utils/decimal";

interface InventoryTableDialogsProps {
  selectedLot: ReturnType<typeof useInventoryTableLogic>["selectedLot"];
  editDialog: ReturnType<typeof useInventoryTableLogic>["editDialog"];
  lockDialog: ReturnType<typeof useInventoryTableLogic>["lockDialog"];
  updateLotMutation: ReturnType<typeof useInventoryTableLogic>["updateLotMutation"];
  lockLotMutation: ReturnType<typeof useInventoryTableLogic>["lockLotMutation"];
  onCloseEdit: () => void;
  onCloseLock: () => void;
}

export function InventoryTableDialogs({
  selectedLot,
  editDialog,
  lockDialog,
  updateLotMutation,
  lockLotMutation,
  onCloseEdit,
  onCloseLock,
}: InventoryTableDialogsProps) {
  if (!selectedLot) return null;

  return (
    <>
      <FormDialog
        open={editDialog.isOpen}
        onClose={onCloseEdit}
        title="ロット編集"
        description={`ロット ${selectedLot.lot_number || "-"} を編集します`}
        size="lg"
      >
        <LotEditForm
          initialData={selectedLot}
          onSubmit={async (data: LotUpdateData) => {
            await updateLotMutation.mutateAsync(data);
          }}
          onCancel={onCloseEdit}
          isSubmitting={updateLotMutation.isPending}
        />
      </FormDialog>

      <LotLockDialog
        open={lockDialog.isOpen}
        onClose={onCloseLock}
        onConfirm={async (reason, quantity) => {
          await lockLotMutation.mutateAsync({ id: selectedLot.id, reason, quantity });
        }}
        isSubmitting={lockLotMutation.isPending}
        lotNumber={selectedLot.lot_number || "-"}
        availableQuantity={calculateAvailable(
          selectedLot.current_quantity,
          selectedLot.allocated_quantity,
          selectedLot.locked_quantity || "0",
        ).toNumber()}
      />
    </>
  );
}
