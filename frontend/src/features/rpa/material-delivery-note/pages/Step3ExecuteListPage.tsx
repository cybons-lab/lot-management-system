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
  downloaded: { label: "ダウンロード完了", variant: "secondary" },
  draft: { label: "ダウンロード完了", variant: "secondary" }, // Legacy
  ready_for_step2: { label: "実行待ち", variant: "default" },
  step2_running: { label: "実行中", variant: "outline" },
  done: { label: "完了", variant: "outline" },
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
    } catch {
      // Error handled in hook
    }
  };

  const handleGoToDetail = () => {
    navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUN_DETAIL(run.id));
  };

  if (run.status === "step2_running") {
    return (
      <Button size="sm" variant="outline" className="cursor-not-allowed gap-2 opacity-70">
        <Loader2 className="h-4 w-4 animate-spin" />
        実行中...
      </Button>
    );
  }

  // 実行済み、または実行中から完了へ遷移した場合
  if (
    run.status === "done" ||
    (run.status !== "ready_for_step2" && run.status !== "step2_running")
  ) {
    return (
      <Button size="sm" variant="default" className="gap-2" onClick={handleGoToDetail}>
        詳細へ <ArrowRight className="h-4 w-4" />
      </Button>
    );
  }

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
          起動中...
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
  // 5秒ごとにポーリングして進捗を更新
  const { data, isLoading, error } = useRuns(0, 100, { refetchInterval: 5000 });

  const displayRuns = useMemo(() => {
    if (!data?.runs) return [];
    // 実行待ち、実行中、および完了済みを表示（完了済みは直近のものだけに絞るなどの考慮が必要かもしれないが、一旦全て表示）
    // ユーザー要望：Step2完了(=ready_for_step2)以降のものが見える
    return data.runs.filter(
      (run) =>
        run.status === "ready_for_step2" || run.status === "step2_running" || run.status === "done",
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
                <TableHead>進捗</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    実行待ちのデータはありません。
                  </TableCell>
                </TableRow>
              ) : (
                displayRuns.map((run) => {
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
