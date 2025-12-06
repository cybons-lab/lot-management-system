/**
 * SupplierAssignmentEditDialog.tsx
 *
 * 仕入先ごとの担当者を編集するダイアログ
 * - 主担当者の変更
 * - 担当者の削除
 */

import { useState } from "react";
import { Crown, Trash2, User } from "lucide-react";

import { useAssignmentMutations } from "../hooks/useAssignments";
import type { SupplierGroup } from "../pages/PrimaryAssignmentsPage";

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
  DialogHeader,
  DialogTitle,
  Badge,
} from "@/components/ui";

interface SupplierAssignmentEditDialogProps {
  group: SupplierGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierAssignmentEditDialog({
  group,
  open,
  onOpenChange,
}: SupplierAssignmentEditDialogProps) {
  const { setPrimaryUser, deleteAssignment, isSettingPrimary, isDeleting } =
    useAssignmentMutations();
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const handleSetPrimary = async (userId: number) => {
    try {
      await setPrimaryUser({ supplierId: group.supplier_id, userId });
      onOpenChange(false);
    } catch {
      // Error handled in mutation hook
    }
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteAssignment(deleteTarget);
      setDeleteTarget(null);
    } catch {
      // Error handled in mutation hook
    }
  };

  const isPending = isSettingPrimary || isDeleting;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {group.supplier_name} ({group.supplier_code}) の担当者編集
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {group.assignments.length === 0 ? (
              <p className="text-center text-gray-500">担当者が設定されていません</p>
            ) : (
              group.assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    {assignment.is_primary ? (
                      <Crown className="h-4 w-4 text-amber-500" />
                    ) : (
                      <User className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium">{assignment.display_name}</span>
                    {assignment.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        主担当
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!assignment.is_primary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetPrimary(assignment.user_id)}
                        disabled={isPending}
                      >
                        <Crown className="mr-1 h-3 w-3" />
                        主担当に設定
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setDeleteTarget(assignment.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>担当者を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。担当者の割り当てを削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
