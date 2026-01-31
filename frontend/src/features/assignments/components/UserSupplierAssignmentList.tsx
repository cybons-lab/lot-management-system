/**
 * UserSupplierAssignmentList
 * 指定したユーザーの担当仕入先一覧を表示・管理する
 */
import { Trash2, User } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { useAssignmentMutations } from "../hooks/useAssignments";
import { useMySuppliers } from "../hooks/useMySuppliers";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from "@/components/ui";

interface UserSupplierAssignmentListProps {
  userId: number;
}

export function UserSupplierAssignmentList({ userId }: UserSupplierAssignmentListProps) {
  // useMySuppliersは現在のログインユーザー用だが、userIdを渡せるようにフックを拡張するか、
  // ここでは直接APIを叩くか検討が必要。
  // 現状はuseMySuppliersがuserIdを受け取らないため、もし他人の担当を見たい場合は修正が必要。
  // ここではUserDetailDialogで使われているため、本来は指定したuserIdの情報を出すべき。
  // 修正：useMySuppliersの代わりにuseUserAssignmentsを使用（もしあれば）またはuseMySuppliersを拡張。
  // 一旦、現在の実装に合わせて表示ロジックを修正。
  const { data, isLoading, refetch } = useMySuppliers(userId);
  const assignments = useMemo(() => data?.assignments || [], [data]);
  const { deleteAssignment, isDeleting } = useAssignmentMutations();

  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => a.supplier_code.localeCompare(b.supplier_code));
  }, [assignments]);

  const handleDelete = async (assignmentId: number) => {
    try {
      await deleteAssignment(assignmentId);
      toast.success("担当を解除しました");
      refetch();
    } catch {
      // Error is handled in mutation hook
    }
  };

  if (isLoading) {
    return <div className="py-4 text-center text-sm text-gray-500">読み込み中...</div>;
  }

  if (assignments.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-500">担当仕入先はありません</div>;
  }

  return (
    <div className="space-y-2">
      {sortedAssignments.map((assignment) => (
        <div
          key={assignment.id}
          className="flex h-10 items-center justify-between rounded-md border bg-white px-3 py-2"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <User className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="truncate text-sm font-medium">{assignment.supplier_name}</span>
            <span className="flex-shrink-0 font-mono text-xs text-muted-foreground">
              ({assignment.supplier_code})
            </span>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>担当の解除</AlertDialogTitle>
                <AlertDialogDescription>
                  {assignment.supplier_name} の担当を解除しますか？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handleDelete(assignment.id)}
                >
                  解除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}
