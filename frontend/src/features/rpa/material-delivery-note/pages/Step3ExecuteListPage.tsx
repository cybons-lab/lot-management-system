/**
 * Step3ExecuteListPage
 * 素材納品書発行 Step3 - 実行画面
 */

/* eslint-disable max-lines-per-function */
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Loader2, Play, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { RpaRunSummary } from "../api";
import { useExecuteStep2, useRuns } from "../hooks";

import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/constants/routes";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// ステータス表示用のマッピング
const STATUS_LABELS: Record<
  string,
  { label: string; variant: "secondary" | "default" | "destructive" | "outline" }
> = {
  step2_confirmed: { label: "実行待ち", variant: "default" }, // 旧 ready_for_step2
  step3_running: { label: "実行中", variant: "outline" }, // 旧 step2_running
  step3_done: { label: "完了", variant: "secondary" },
  done: { label: "全完了", variant: "outline" },
};

// Sub component for row action to handle hook per run
function RunActionCell({ run }: { run: RpaRunSummary }) {
  const navigate = useNavigate();
  const executeMutation = useExecuteStep2(run.id);

  const handleExecute = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(`本当に実行してよろしいですか？\nID: ${run.id} の納品書発行を実行します。`)) {
      return;
    }

    try {
      await executeMutation.mutateAsync({
        // Backend will handle defaults
      });
      navigate(`/rpa/material-delivery-note/step3/${run.id}`);
    } catch {
      // Error handled in hook
    }
  };

  return (
    <div className="flex justify-end gap-2">
      {run.status === "step2_confirmed" && (
        <Button size="sm" onClick={handleExecute} disabled={executeMutation.isPending}>
          {executeMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              起動中...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              実行
            </>
          )}
        </Button>
      )}
      <Button variant="outline" size="sm" asChild>
        <Link to={`/rpa/material-delivery-note/step3/${run.id}`}>
          詳細 <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export function Step3ExecuteListPage() {
  // 5秒ごとにポーリングして進捗を更新
  const { data, isLoading, error } = useRuns(0, 100, { refetchInterval: 5000 });

  const readyRuns = useMemo(
    () => data?.runs.filter((run) => run.status === "step2_confirmed") ?? [],
    [data],
  );
  const historyRuns = useMemo(
    () =>
      data?.runs.filter(
        (run) =>
          run.status === "step3_running" ||
          run.status === "step3_done" ||
          run.status === "done",
      ) ?? [],
    [data],
  );

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
        title="Step3: 実行"
        subtitle="実行可能なRunを選択してStep3（Power Automate呼び出し）を実行します"
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
            <p className="text-sm text-gray-500">
              全アイテムのチェックが完了し、実行待ちのデータです。
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>対象期間</TableHead>
                <TableHead>取込日時</TableHead>
                <TableHead>実行ユーザー</TableHead>
                <TableHead>発行対象</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    実行待ちのデータはありません。
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
                        {run.issue_count} / {run.item_count} 件
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

        <div className="rounded-md border bg-white shadow-sm">
          <div className="border-b bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900">履歴</h3>
            <p className="text-sm text-gray-500">実行中・完了済みのRunはここに表示されます。</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>対象期間</TableHead>
                <TableHead>取込日時</TableHead>
                <TableHead>実行ユーザー</TableHead>
                <TableHead>発行対象</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-gray-500">
                    実行中・完了済みのデータはありません。
                  </TableCell>
                </TableRow>
              ) : (
                historyRuns.map((run) => {
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
                        {run.issue_count} / {run.item_count} 件
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/rpa/material-delivery-note/step3/${run.id}`}>
                            詳細 <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
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
