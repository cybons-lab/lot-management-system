/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
/**
 * Step3DetailPage - Step3専用ページ
 *
 * Step3のPAD実行監視ページ。
 * - 常にStep3専用列を表示（発行対象、結果）
 * - アクセス制御: status >= step2_confirmed でないと表示不可
 * - 常に読取専用
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, Filter, Loader2, ExternalLink, AlertCircle, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import type { RpaRun } from "../api";
import { markExternalDone } from "../api";
import { useRun } from "../hooks";

import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
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

// ステータス表示用
const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  step1_done: { label: "Step1完了", color: "bg-gray-500" },
  step2_confirmed: { label: "Step2確認済", color: "bg-blue-500" },
  step3_running: { label: "PAD実行中", color: "bg-yellow-500" },
  step3_done: { label: "外部手順待ち", color: "bg-orange-500" },
  step4_checking: { label: "突合中", color: "bg-purple-500" },
  step4_ng_retry: { label: "NG再実行中", color: "bg-red-500" },
  step4_review: { label: "レビュー中", color: "bg-indigo-500" },
  done: { label: "完了", color: "bg-green-600" },
  cancelled: { label: "キャンセル", color: "bg-gray-400" },
};

// Step3にアクセス可能なステータス（Step2を通過済み）
const STEP3_ACCESSIBLE_STATUSES = [
  "step2_confirmed",
  "step3_running",
  "step3_done",
  "step4_checking",
  "step4_ng_retry",
  "step4_review",
  "done",
];

export function Step3DetailPage() {
  const { runId } = useParams();
  const id = parseInt(runId || "0", 10);
  const queryClient = useQueryClient();

  const [layerFilter, setLayerFilter] = useState<string>("all");

  const {
    data: run,
    isLoading,
    error,
  } = useRun(id, {
    refetchInterval: authAwareRefetchInterval<RpaRun, Error, RpaRun>(3000),
  });

  const externalDoneMutation = useMutation({
    mutationFn: markExternalDone,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rpa-run", id] }),
  });

  // Filter Logic - Step3では発行対象(issue_flag=true)のアイテムのみ表示
  const filteredItems = useMemo(() => {
    if (!run?.items) return [];
    // 発行対象のアイテムのみを対象とする
    let items = run.items.filter((item) => item.issue_flag);
    if (layerFilter !== "all") {
      items = items.filter((item) => item.layer_code === layerFilter);
    }
    return [...items].sort((a, b) => a.row_no - b.row_no);
  }, [run?.items, layerFilter]);

  // Unique Layer Options - 発行対象(issue_flag=true)のアイテムを持つメーカーのみ
  const layerOptions = useMemo(() => {
    if (!run?.items) return [];
    // 発行対象のアイテムのみからメーカーを抽出
    const issuedItems = run.items.filter((item) => item.issue_flag);
    const uniqueCodes = Array.from(
      new Set(issuedItems.map((item) => item.layer_code).filter(Boolean)),
    );
    return uniqueCodes.sort().map((code) => {
      const item = issuedItems.find((i) => i.layer_code === code);
      const makerName = item?.maker_name;
      const label = makerName ? `${makerName} (${code})` : (code as string);
      return { value: code as string, label };
    });
  }, [run?.items]);

  if (isLoading) return <div>Loading...</div>;
  if (error || !run) return <div>Error detected.</div>;

  const statusDisplay = STATUS_DISPLAY[run.status] || { label: run.status, color: "bg-gray-400" };

  // アクセス制御: Step2未完了なら表示不可
  const canAccessStep3 = STEP3_ACCESSIBLE_STATUSES.includes(run.status);

  // ステータス別の判定
  const isStep3Running = run.status === "step3_running";
  const canMarkExternalDone = run.status === "step3_done";

  // ハンドラー
  const handleExternalDone = () => {
    if (
      confirm("外部手順が完了したことをマークしますか？\n※ Step4の突合チェックが自動開始されます")
    ) {
      externalDoneMutation.mutate(id);
    }
  };

  // 進捗計算
  const totalIssued = run.items.filter((i) => i.issue_flag).length;
  const completed = run.items.filter(
    (i) =>
      i.issue_flag &&
      ["success", "failure", "error", "failed_timeout"].includes(i.result_status || ""),
  ).length;
  const processing = run.items.filter((i) => i.result_status === "processing").length;

  return (
    <PageContainer>
      {/* ナビゲーションバー */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Step3一覧へ戻る
        </Link>
        <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}>
          <Button variant="outline" size="sm">
            メニューへ戻る
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`Run #${run.id} - Step3 PAD実行`}
        subtitle={`取込日時: ${format(new Date(run.created_at), "yyyy/MM/dd HH:mm")}`}
        actions={
          canMarkExternalDone && (
            <div className="flex gap-2">
              <Button onClick={handleExternalDone} disabled={externalDoneMutation.isPending}>
                {externalDoneMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                外部手順完了
              </Button>
            </div>
          )
        }
      />

      {/* アクセス不可メッセージ */}
      {!canAccessStep3 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
          <h3 className="text-lg font-medium text-red-800">Step2が未完了です</h3>
          <p className="mt-1 text-sm text-red-600">
            Step3のデータを表示するには、先にStep2を完了させてください。
          </p>
          <Link to={`/rpa/material-delivery-note/runs/${id}`}>
            <Button variant="outline" className="mt-4">
              Step2へ移動
            </Button>
          </Link>
        </div>
      )}

      {/* Step3にアクセス可能な場合のみ表示 */}
      {canAccessStep3 && (
        <>
          {/* ステータスバナー */}
          <div className="mb-6 flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-gray-500">ステータス</div>
                <div className="text-lg font-medium">
                  <Badge className={statusDisplay.color}>{statusDisplay.label}</Badge>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <div className="text-sm text-gray-500">PAD進捗</div>
                <div className="text-lg font-medium">
                  {completed} / {totalIssued}
                  <span className="ml-1 text-sm text-gray-500">件 完了</span>
                  {processing > 0 && (
                    <span className="ml-2 text-sm text-blue-500">({processing}件 処理中)</span>
                  )}
                </div>
              </div>
            </div>
            {run.step2_executed_at && (
              <div className="text-right">
                <div className="text-sm text-gray-500">PAD開始日時</div>
                <div className="font-medium">
                  {format(new Date(run.step2_executed_at), "yyyy/MM/dd HH:mm")}
                </div>
              </div>
            )}
            {/* Step4へ進むボタン（Step3完了以降） */}
            {["step3_done", "step4_checking", "step4_ng_retry", "step4_review", "done"].includes(
              run.status,
            ) && (
              <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP4_DETAIL(run.id)}>
                <Button variant="default">
                  Step4へ進む <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          {/* PAD実行中の表示 */}
          {isStep3Running && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
              <span className="text-sm text-yellow-800">PAD実行中... 自動更新されます</span>
            </div>
          )}

          {/* フィルタ */}
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={layerFilter} onValueChange={setLayerFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="メーカー・層別フィルタ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て表示</SelectItem>
                {layerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {layerFilter !== "all" && (
              <div className="ml-2 text-sm text-gray-500">{filteredItems.length} 件表示中</div>
            )}
          </div>

          {/* テーブル - Step3専用列 */}
          <div className="rounded-md border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>出荷先</TableHead>
                  <TableHead>層別</TableHead>
                  <TableHead>メーカー名</TableHead>
                  <TableHead>材質コード</TableHead>
                  <TableHead>納期</TableHead>
                  <TableHead>出荷便</TableHead>
                  <TableHead>結果</TableHead>
                  <TableHead className="text-center">突合</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.row_no}</TableCell>
                    <TableCell className="text-sm">{item.status || "-"}</TableCell>
                    <TableCell>{item.jiku_code}</TableCell>
                    <TableCell>{item.layer_code}</TableCell>
                    <TableCell className="text-sm">{item.maker_name}</TableCell>
                    <TableCell>{item.customer_part_no}</TableCell>
                    <TableCell>
                      {item.delivery_date ? format(new Date(item.delivery_date), "MM/dd") : ""}
                    </TableCell>
                    <TableCell>{item.shipping_vehicle}</TableCell>
                    <TableCell>
                      {item.result_status === "success" && (
                        <Badge className="bg-green-600">成功</Badge>
                      )}
                      {item.result_status === "failure" && (
                        <Badge className="bg-orange-500">失敗</Badge>
                      )}
                      {item.result_status === "failed_timeout" && (
                        <Badge variant="destructive">回収</Badge>
                      )}
                      {item.result_status === "error" && (
                        <Badge variant="destructive">エラー</Badge>
                      )}
                      {item.result_status === "pending" && <Badge variant="secondary">待機</Badge>}
                      {item.result_status === "processing" && (
                        <Badge className="animate-pulse bg-blue-500">処理中</Badge>
                      )}
                      {!item.result_status && <Badge variant="outline">未開始</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.match_result === true && <Badge className="bg-green-600">○</Badge>}
                      {item.match_result === false && <Badge variant="destructive">×</Badge>}
                      {item.match_result === null && <span className="text-gray-400">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </PageContainer>
  );
}
