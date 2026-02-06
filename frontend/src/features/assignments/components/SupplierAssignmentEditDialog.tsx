/**
 * SupplierAssignmentEditDialog.tsx
 *
 * 仕入先ごとの担当者を編集するダイアログ
 * - 担当者の削除
 */

import { Trash2, User } from "lucide-react";
import { useState } from "react";

import { useAssignmentMutations } from "../hooks/useAssignments";
import type { SupplierGroup } from "../types";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

interface SupplierAssignmentEditDialogProps {
  group: SupplierGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AssignmentRows({
  group,
  isPending,
  onRequestDelete,
}: {
  group: SupplierGroup;
  isPending: boolean;
  onRequestDelete: (id: number, version: number) => void;
}) {
  if (group.assignments.length === 0) {
    return <p className="text-center text-gray-500">担当者が設定されていません</p>;
  }

  return (
    <>
      {group.assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{assignment.display_name}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => onRequestDelete(assignment.id, assignment.version)}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </>
  );
}

function DeleteConfirmDialog({
  open,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>担当者を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            この操作は取り消せません。担当者の割り当てを削除します。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600"
            disabled={isDeleting}
          >
            {isDeleting ? "削除中..." : "削除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SupplierAssignmentEditDialog({
  group,
  open,
  onOpenChange,
}: SupplierAssignmentEditDialogProps) {
  const { deleteAssignment, isDeleting } = useAssignmentMutations();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    version: number;
  } | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAssignment(deleteTarget);
      setDeleteTarget(null);
    } catch {
      // Error handled in mutation hook
    }
  };

  const isPending = isDeleting;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {group.supplier_name} ({group.supplier_code}) の担当者編集
            </DialogTitle>
            <DialogDescription>担当者の削除を行えます</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <AssignmentRows
              group={group}
              isPending={isPending}
              onRequestDelete={(id, version) => setDeleteTarget({ id, version })}
            />
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
