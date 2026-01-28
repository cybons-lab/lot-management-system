import { type UseQueryResult, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getCloudFlowConfigOptional, type MaterialDeliverySimpleJobResponse } from "../api";
import { useExecuteMaterialDeliveryStep2, useDeleteMaterialDeliverySimpleHistory } from "../hooks";

import { Button } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STEP2_CONFIG_KEY = "MATERIAL_DELIVERY_STEP2_URL";

interface HistoryTableProps {
  historyQuery: UseQueryResult<MaterialDeliverySimpleJobResponse[], Error>;
  onConfigError: () => void;
}

// eslint-disable-next-line max-lines-per-function
export function HistoryTable({ historyQuery, onConfigError }: HistoryTableProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [step2ConfirmOpen, setStep2ConfirmOpen] = useState(false);
  const [step2Target, setStep2Target] = useState<{ start: string; end: string } | null>(null);

  const queryClient = useQueryClient();
  const step2Mutation = useExecuteMaterialDeliveryStep2();
  const deleteMutation = useDeleteMaterialDeliverySimpleHistory();

  const handleExecuteStep2 = async (rowStartDate: string, rowEndDate: string) => {
    try {
      // 設定チェック
      const config = await queryClient.fetchQuery({
        queryKey: ["rpa", "config", STEP2_CONFIG_KEY],
        queryFn: () => getCloudFlowConfigOptional(STEP2_CONFIG_KEY),
        staleTime: 0,
      });

      if (!config) {
        toast.error("URL設定が見つかりません。右上の設定ボタンから設定してください。");
        onConfigError();
        return;
      }

      await step2Mutation.mutateAsync({ start_date: rowStartDate, end_date: rowEndDate });
      toast.success("Step2を実行しました");
    } catch (error) {
      console.error(error);
      toast.error("Step2の実行に失敗しました");
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const handleStep2Click = (startDate: string, endDate: string) => {
    setStep2Target({ start: startDate, end: endDate });
    setStep2ConfirmOpen(true);
  };

  const handleStep2Confirm = async () => {
    if (!step2Target) return;
    setStep2ConfirmOpen(false);
    await handleExecuteStep2(step2Target.start, step2Target.end);
    setStep2Target(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingId === null) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success("履歴を削除しました");
      setDeletingId(null);
      setDeleteConfirmOpen(false);
    } catch (error) {
      toast.error("削除に失敗しました");
      console.error(error);
    }
  };

  return (
    <>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>履歴の削除</AlertDialogTitle>
            <AlertDialogDescription>
              この履歴を削除してもよろしいですか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={step2ConfirmOpen} onOpenChange={setStep2ConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Step2 実行確認</AlertDialogTitle>
            <AlertDialogDescription>
              Step2を実行しますか？
              <br />
              期間: {step2Target?.start} 〜 {step2Target?.end}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleStep2Confirm}>実行する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="text-sm font-semibold">Step1 履歴</div>
        {historyQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : historyQuery.data && historyQuery.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>実行日時</TableHead>
                <TableHead>期間</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>実行者</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.data.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{format(new Date(job.requested_at), "yyyy/MM/dd HH:mm")}</TableCell>
                  <TableCell>
                    {job.start_date} 〜 {job.end_date}
                  </TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.requested_by ?? "system"}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStep2Click(job.start_date, job.end_date)}
                      disabled={step2Mutation.isPending}
                    >
                      Step2 実行
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteClick(job.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">履歴がありません</p>
        )}
      </div>
    </>
  );
}
