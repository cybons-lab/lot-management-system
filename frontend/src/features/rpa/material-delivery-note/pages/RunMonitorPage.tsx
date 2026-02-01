/**
 * RunMonitorPage
 * 素材納品書発行 Step5 - Run監視・制御
 */

/* eslint-disable max-lines-per-function, complexity */
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { AlertTriangle, ArrowLeft, Clock, PauseCircle, PlayCircle, StopCircle } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import type { LoopSummary, RpaRun, RpaRunEvent, RpaRunItem } from "../api";
import { MaterialDeliveryRunProgress } from "../components/MaterialDeliveryRunProgress";
import {
  useCancelRun,
  useDownloadFailedItems,
  useFailedItems,
  useLoopSummary,
  usePauseRun,
  useResumeRun,
  useRun,
  useRunEvents,
} from "../hooks";

import { Button, Progress } from "@/components/ui";
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
import { authAwareRefetchInterval } from "@/shared/libs/query-utils";

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "secondary" | "default" | "destructive" | "outline" }
> = {
  step1_done: { label: "Step1完了", variant: "secondary" },
  step2_confirmed: { label: "Step2確認済", variant: "default" },
  step3_running: { label: "PAD実行中", variant: "outline" },
  step3_done: { label: "外部手順待ち", variant: "outline" },
  step4_checking: { label: "突合中", variant: "default" },
  step4_ng_retry: { label: "NG再実行中", variant: "destructive" },
  step4_review: { label: "レビュー中", variant: "default" },
  done: { label: "完了", variant: "secondary" },
  cancelled: { label: "キャンセル", variant: "destructive" },
};

export function RunMonitorPage() {
  const { runId } = useParams<{ runId: string }>();
  const id = Number(runId);

  const {
    data: run,
    isLoading,
    error,
  } = useRun(id, {
    refetchInterval: authAwareRefetchInterval<RpaRun, Error, RpaRun>(5000),
  });
  const { data: loopSummary } = useLoopSummary(id, {
    refetchInterval: authAwareRefetchInterval<LoopSummary, Error, LoopSummary>(5000),
  });
  const { data: events } = useRunEvents(id, 100, {
    refetchInterval: authAwareRefetchInterval<RpaRunEvent[], Error, RpaRunEvent[]>(10000),
  });
  const { data: failedItems } = useFailedItems(id, {
    refetchInterval: authAwareRefetchInterval<RpaRunItem[], Error, RpaRunItem[]>(10000),
  });
  const pauseMutation = usePauseRun(id);
  const resumeMutation = useResumeRun(id);
  const cancelMutation = useCancelRun(id);
  const downloadMutation = useDownloadFailedItems(id);

  const statusInfo = run ? STATUS_LABELS[run.status] : undefined;
  const progressValue = useMemo(() => {
    if (!run && !loopSummary) return 0;
    if (run?.progress_percent != null) return run.progress_percent;
    return loopSummary?.percent ?? 0;
  }, [run, loopSummary]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Clock className="h-8 w-8 animate-pulse text-gray-400" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        読み込みに失敗しました。
      </div>
    );
  }

  const isPaused = Boolean(run.paused_at);
  const isCancelled = run.status === "cancelled";
  const isDone = run.status === "done";

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <Link
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUNS}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          実行履歴へ戻る
        </Link>
        <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}>
          <Button variant="outline" size="sm">
            メニューへ戻る
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`Run #${run.id} 監視`}
        subtitle={`取込日時: ${format(new Date(run.created_at), "yyyy/MM/dd HH:mm", { locale: ja })}`}
      />

      <div className="space-y-6">
        {/* 進捗チェックリスト */}
        <MaterialDeliveryRunProgress
          runId={run.id}
          events={events}
          status={run.status}
          isLoading={false}
        />

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-500">ステータス</div>
              <Badge variant={statusInfo?.variant ?? "outline"}>
                {statusInfo?.label ?? run.status}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-500">対象件数</div>
              <div className="text-lg font-semibold text-gray-900">
                {run.issue_count} / {run.item_count}
                <span className="ml-2 text-sm text-gray-500">発行対象</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-500">最終更新</div>
              <div className="text-sm text-gray-700">
                {run.updated_at
                  ? format(new Date(run.updated_at), "yyyy/MM/dd HH:mm", { locale: ja })
                  : "-"}
              </div>
            </div>
          </div>

          {isPaused && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mr-2 inline-block h-4 w-4" />
              このRunは一時停止中です。
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Button
              variant="outline"
              onClick={() => pauseMutation.mutate()}
              disabled={isPaused || isCancelled || isDone || pauseMutation.isPending}
            >
              <PauseCircle className="mr-2 h-4 w-4" />
              一時停止
            </Button>
            <Button
              variant="outline"
              onClick={() => resumeMutation.mutate()}
              disabled={!isPaused || isCancelled || isDone || resumeMutation.isPending}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              再開
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("このRunを中断しますか？")) {
                  cancelMutation.mutate();
                }
              }}
              disabled={isCancelled || isDone || cancelMutation.isPending}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              中断
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">進捗</div>
              <div className="text-lg font-semibold text-gray-900">{progressValue.toFixed(1)}%</div>
            </div>
            <div className="text-sm text-gray-500">推定時間: {run.estimated_minutes ?? "-"} 分</div>
          </div>
          <Progress value={progressValue} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 sm:grid-cols-5">
            <div>総数: {loopSummary?.total ?? "-"}</div>
            <div>成功: {loopSummary?.success ?? "-"}</div>
            <div>失敗: {loopSummary?.failure ?? "-"}</div>
            <div>処理中: {loopSummary?.processing ?? "-"}</div>
            <div>残り: {loopSummary?.remaining ?? "-"}</div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-base font-semibold text-gray-900">イベントログ</div>
            <div className="text-xs text-gray-500">最新100件</div>
          </div>
          {events && events.length > 0 ? (
            <div className="space-y-2 text-sm">
              {events.map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-gray-900">{event.event_type}</div>
                    <div className="text-gray-600">{event.message || "-"}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(event.created_at), "yyyy/MM/dd HH:mm", { locale: ja })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">イベントログはまだありません。</div>
          )}
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-base font-semibold text-gray-900">失敗アイテム</div>
            <Button
              variant="outline"
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
            >
              Excel出力
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>納品書番号</TableHead>
                <TableHead>受発注No</TableHead>
                <TableHead>層別コード</TableHead>
                <TableHead>エラーコード</TableHead>
                <TableHead>エラーメッセージ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failedItems && failedItems.length > 0 ? (
                failedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.item_no || "-"}</TableCell>
                    <TableCell>{item.order_no || "-"}</TableCell>
                    <TableCell>{item.layer_code || "-"}</TableCell>
                    <TableCell>{item.last_error_code || item.result_status || "-"}</TableCell>
                    <TableCell>{item.last_error_message || item.result_message || "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-gray-500">
                    失敗アイテムはありません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageContainer>
  );
}
