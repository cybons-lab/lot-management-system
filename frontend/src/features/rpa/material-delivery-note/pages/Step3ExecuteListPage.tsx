/**
 * Step3ExecuteListPage
 * 素材納品書発行 Step3 - 実行画面
 */

/* eslint-disable max-lines-per-function */
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Loader2, Play } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import type { RpaRunSummary } from "../api";
import { useExecuteStep2, useRuns } from "../hooks";

import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell } from "@/components/ui/table";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROUTES } from "@/constants/routes";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// ステータス表示用のマッピング
const STATUS_LABELS: Record<
  string,
  { label: string; variant: "secondary" | "default" | "destructive" | "outline" }
> = {
  downloaded: { label: "ダウンロード完了", variant: "secondary" },
  draft: { label: "ダウンロード完了", variant: "secondary" }, // Legacy
  ready_for_step2: { label: "確認完了", variant: "default" },
  step2_running: { label: "発行中", variant: "outline" },
  done: { label: "発行完了", variant: "outline" }, // 通常リストには出ないが念のため
};

// Sub component for row action to handle hook per run
function RunActionCell({ run }: { run: RpaRunSummary }) {
  const executeMutation = useExecuteStep2(run.id);

  const handleExecute = async () => {
    if (!confirm(`本当に実行してよろしいですか？\nID: ${run.id} の納品書発行を実行します。`)) {
      return;
    }

    try {
      await executeMutation.mutateAsync({
        // Backend will handle defaults
      });
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Button
      size="sm"
      className="gap-2"
      onClick={handleExecute}
      disabled={executeMutation.isPending || run.status !== "ready_for_step2"}
    >
      {executeMutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          実行中...
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          実行
        </>
      )}
    </Button>
  );
}

export function Step3ExecuteListPage() {
  const { data, isLoading, error } = useRuns(0, 100);

  const readyRuns = useMemo(() => {
    if (!data?.runs) return [];
    return data.runs.filter(
      (run) => run.status === "ready_for_step2" || run.status === "step2_running",
    );
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        エラーが発生しました: {error.message}
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Step3: 納品書発行実行"
        subtitle="確認完了データを元に、Power Automateを実行して納品書を発行します。"
      />

      <div className="space-y-4">
        <div className="flex justify-end">
          <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}>
            <Button variant="outline">メニューへ戻る</Button>
          </Link>
        </div>

        <div className="rounded-md border bg-white shadow-sm">
          <div className="border-b bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900">Step3 実行待ち一覧</h3>
            <p className="text-sm text-gray-500">確認が完了し、発行待ちのデータです。</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>取得期間</TableHead>
                <TableHead>確認完了日時</TableHead>
                <TableHead>実行ユーザー</TableHead>
                <TableHead>進捗</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    実行待ちのデータはありません。
                    <br />
                    Step2でデータを確認・完了してください。
                  </TableCell>
                </TableRow>
              ) : (
                readyRuns.map((run) => {
                  const statusInfo = STATUS_LABELS[run.status] || {
                    label: run.status,
                    variant: "secondary" as const,
                  };
                  return (
                    <TableRow key={run.id}>
                      <TableCell>{run.id}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {run.data_start_date && run.data_end_date ? (
                          <span className="text-sm">
                            {run.data_start_date} 〜 {run.data_end_date}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(run.created_at), "yyyy/MM/dd HH:mm", {
                          locale: ja,
                        })}
                      </TableCell>
                      <TableCell>{run.started_by_username || "-"}</TableCell>
                      <TableCell>
                        {run.complete_count} / {run.item_count} 件
                      </TableCell>
                      <TableCell className="text-right">
                        <RunActionCell run={run} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageContainer>
  );
}
