import { type Maker, type MakerCreateRequest, type MakerUpdateInput } from "../api";

import { MakerForm } from "./MakerForm";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface MakerDialogsProps {
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  editingMaker: Maker | null;
  setEditingMaker: (maker: Maker | null) => void;
  deletingMaker: Maker | null;
  setDeletingMaker: (maker: Maker | null) => void;
  onCreate: (data: MakerCreateRequest) => void;
  onUpdate: (data: MakerUpdateInput) => void;
  onDelete: () => void;
  isCreatePending: boolean;
  isUpdatePending: boolean;
}

export function MakerDialogs({
  isCreateOpen,
  setIsCreateOpen,
  editingMaker,
  setEditingMaker,
  deletingMaker,
  setDeletingMaker,
  onCreate,
  onUpdate,
  onDelete,
  isCreatePending,
  isUpdatePending,
}: MakerDialogsProps) {
  return (
    <>
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>メーカー新規登録</DialogTitle>
          </DialogHeader>
          <MakerForm
            onSubmit={onCreate}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={isCreatePending}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingMaker}
        onOpenChange={(open: boolean) => !open && setEditingMaker(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>メーカー編集</DialogTitle>
          </DialogHeader>
          {editingMaker && (
            <MakerForm
              initialData={editingMaker}
              onSubmit={onUpdate}
              onCancel={() => setEditingMaker(null)}
              isSubmitting={isUpdatePending}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingMaker}
        onOpenChange={(open: boolean) => !open && setDeletingMaker(null)}
        title="メーカーを削除しますか？"
        description={`${deletingMaker?.maker_name}（${deletingMaker?.maker_code}）を削除します。この操作は取り消せません。`}
        onConfirm={onDelete}
        variant="destructive"
      />
    </>
  );
}
