/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
/**
 * Step4DetailPage - Step4専用ページ
 *
 * Step4の突合・レビューページ。
 * - 常にStep4専用列を表示（SAP、受発注No、突合、結果）
 * - アクセス制御: status >= step3_done でないと表示不可
 * - 常に読取専用
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Check,
  ChevronLeft,
  X,
  Filter,
  Loader2,
  CheckCircle2,
  RefreshCcw,
  AlertCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import type { RpaRun } from "../api";
import { completeStep4, retryFailedItems, updateItem } from "../api";
import { useRun } from "../hooks";

import { Button, Input } from "@/components/ui";
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

// Step4にアクセス可能なステータス（Step3を通過済み）
const STEP4_ACCESSIBLE_STATUSES = [
  "step3_done",
  "step4_checking",
  "step4_ng_retry",
  "step4_review",
  "done",
];

export function Step4DetailPage() {
  const { runId } = useParams();
  const id = parseInt(runId || "0", 10);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [layerFilter, setLayerFilter] = useState<string>("all");

  const { data: run, isLoading, error } = useRun(id, {
    refetchInterval: authAwareRefetchInterval<RpaRun, Error, RpaRun>(3000),
  });

  const retryMutation = useMutation({
    mutationFn: () => retryFailedItems(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rpa-run", id] }),
  });

  const updateLotNoMutation = useMutation({
    mutationFn: ({ itemId, lotNo }: { itemId: number; lotNo: string }) =>
      updateItem(id, itemId, { lot_no: lotNo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rpa-run", id] }),
  });

  const completeMutation = useMutation({
    mutationFn: () => completeStep4(id),
    onSuccess: () => {
      toast.success("Step4を完了しました");
      queryClient.invalidateQueries({ queryKey: ["rpa-run", id] });
      queryClient.invalidateQueries({ queryKey: ["material-delivery-note-runs"] });
      navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP4);
    },
    onError: (error: Error) => {
      toast.error(`完了処理に失敗しました: ${error.message}`);
    },
  });

  const handleLotNoBlur = (itemId: number, value: string) => {
    if (value.trim()) {
      updateLotNoMutation.mutate({ itemId, lotNo: value.trim() });
    }
  };

  // Filter Logic - Step4では突合○のアイテムのみ表示
  const filteredItems = useMemo(() => {
    if (!run?.items) return [];
    // 突合OKのアイテムのみを対象とする
    let items = run.items.filter((item) => item.match_result === true);
    if (layerFilter !== "all") {
      items = items.filter((item) => item.layer_code === layerFilter);
    }
    return [...items].sort((a, b) => a.row_no - b.row_no);
  }, [run?.items, layerFilter]);

  // Unique Layer Options - 突合OKのアイテムを持つメーカーのみ
  const layerOptions = useMemo(() => {
    if (!run?.items) return [];
    const matchedItems = run.items.filter((item) => item.match_result === true);
    const uniqueCodes = Array.from(
      new Set(matchedItems.map((item) => item.layer_code).filter(Boolean)),
    );
    return uniqueCodes.sort().map((code) => {
      const item = matchedItems.find((i) => i.layer_code === code);
      const makerName = item?.maker_name;
      const label = makerName ? `${makerName} (${code})` : (code as string);
      return { value: code as string, label };
    });
  }, [run?.items]);

  if (isLoading) return <div>Loading...</div>;
  if (error || !run) return <div>Error detected.</div>;

  const statusDisplay = STATUS_DISPLAY[run.status] || { label: run.status, color: "bg-gray-400" };

  // アクセス制御: Step3未完了なら表示不可
  const canAccessStep4 = STEP4_ACCESSIBLE_STATUSES.includes(run.status);

  // ステータス別の判定
  const isStep4Processing = run.status === "step4_checking" || run.status === "step4_ng_retry";
  const canReviewOrRetry = run.status === "step4_review";
  const isDone = run.status === "done";

  // 突合結果計算
  const matchCount = run.items.filter((i) => i.match_result === true).length;
  const mismatchCount = run.items.filter((i) => i.match_result === false).length;

  // ハンドラー
  const handleRetry = () => {
    if (confirm("不一致のアイテムを再実行しますか？")) {
      retryMutation.mutate();
    }
  };

  const handleComplete = () => {
    if (completeMutation.isPending) return;
    if (confirm("Step4を完了しますか？")) {
      completeMutation.mutate();
    }
  };

  return (
    <PageContainer>
      {/* ナビゲーションバー */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP4}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Step4一覧へ戻る
        </Link>
        <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}>
          <Button variant="outline" size="sm">
            メニューへ戻る
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`Run #${run.id} - Step4 突合・レビュー`}
        subtitle={`取込日時: ${format(new Date(run.created_at), "yyyy/MM/dd HH:mm")}`}
        actions={
          <div className="flex gap-2">
            {/* Step4レビューボタン */}
            {canReviewOrRetry && (
              <>
                {mismatchCount > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleRetry}
                    disabled={retryMutation.isPending}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    NG再実行 ({mismatchCount}件)
                  </Button>
                )}
                <Button onClick={handleComplete} disabled={completeMutation.isPending}>
                  {completeMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  完了
                </Button>
              </>
            )}

            {/* 完了表示 */}
            {isDone && (
              <Badge className="bg-green-600 px-4 py-2 text-lg">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                完了
              </Badge>
            )}
          </div>
        }
      />

      {/* アクセス不可メッセージ */}
      {!canAccessStep4 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
          <h3 className="text-lg font-medium text-red-800">Step3が未完了です</h3>
          <p className="mt-1 text-sm text-red-600">
            Step4のデータを表示するには、先にStep3を完了させてください。
          </p>
          <Link to={`/rpa/material-delivery-note/step3/${id}`}>
            <Button variant="outline" className="mt-4">
              Step3へ移動
            </Button>
          </Link>
        </div>
      )}

      {/* Step4にアクセス可能な場合のみ表示 */}
      {canAccessStep4 && (
        <>
          {completeMutation.isError && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700">
                完了処理に失敗しました。再度お試しください。
              </span>
            </div>
          )}
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
                <div className="text-sm text-gray-500">突合結果</div>
                <div className="text-lg font-medium">
                  <span className="text-green-600">○ {matchCount}</span>
                  <span className="mx-2">/</span>
                  <span className="text-red-600">× {mismatchCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step4処理中の表示 */}
          {isStep4Processing && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-purple-300 bg-purple-50 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              <span className="text-sm text-purple-800">突合チェック処理中...</span>
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

          {/* テーブル - Step4専用列（突合OKのみ表示） */}
          <div className="rounded-md border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ロットNo</TableHead>
                  <TableHead className="w-[80px]">アイテムNo</TableHead>
                  <TableHead className="w-[50px]">No</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>出荷先</TableHead>
                  <TableHead>層別</TableHead>
                  <TableHead>メーカー名</TableHead>
                  <TableHead>材質コード</TableHead>
                  <TableHead>納期</TableHead>
                  <TableHead>出荷便</TableHead>
                  <TableHead className="text-center">突合</TableHead>
                  <TableHead className="text-center">SAP</TableHead>
                  <TableHead>受注No</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="p-1">
                      <Input
                        className="h-8 w-full font-mono text-sm"
                        defaultValue={item.lot_no || ""}
                        placeholder="ロットNo"
                        onBlur={(e) => handleLotNoBlur(item.id, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-sm">{item.item_no || "-"}</TableCell>
                    <TableCell>{item.row_no}</TableCell>
                    <TableCell className="text-sm">{item.status || "-"}</TableCell>
                    <TableCell>{item.jiku_code || item.destination}</TableCell>
                    <TableCell>{item.layer_code}</TableCell>
                    <TableCell className="text-sm">{item.maker_name}</TableCell>
                    <TableCell>{item.external_product_code || item.material_code}</TableCell>
                    <TableCell>
                      {item.delivery_date ? format(new Date(item.delivery_date), "MM/dd") : ""}
                    </TableCell>
                    <TableCell>{item.shipping_vehicle}</TableCell>
                    <TableCell className="text-center">
                      <Check className="mx-auto h-4 w-4 text-green-600" />
                    </TableCell>
                    <TableCell className="text-center">
                      {item.sap_registered === true && (
                        <Check className="mx-auto h-4 w-4 text-blue-600" />
                      )}
                      {item.sap_registered === false && (
                        <X className="mx-auto h-4 w-4 text-red-400" />
                      )}
                      {item.sap_registered === null && <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{item.order_no || "-"}</TableCell>
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
