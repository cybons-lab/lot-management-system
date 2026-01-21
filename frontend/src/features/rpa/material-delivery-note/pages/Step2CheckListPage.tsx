/**
 * Step2CheckListPage
 * 素材納品書発行 Step2 - 確認画面
 */

/* eslint-disable max-lines-per-function, complexity */
import { ArrowRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useCompleteAllItems, useRun, useRuns, useUpdateItem } from "../hooks";

import { Button, Checkbox } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form";
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

export function Step2CheckListPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useRuns(0, 100);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const selectedRunIdValue =
    selectedRunId ?? data?.runs?.find((run) => run.status === "step1_done")?.id ?? null;
  const { data: runDetail } = useRun(selectedRunIdValue ?? undefined);
  const updateItemMutation = useUpdateItem(selectedRunIdValue ?? 0);
  const completeMutation = useCompleteAllItems(selectedRunIdValue ?? 0);

  const checkRuns = useMemo(() => {
    if (!data?.runs) return [];
    // Step1完了(=step1_done) または Step2確認完了(=step2_confirmed)を表示
    // ユーザー要望：Step2完了後もStep2画面でデータ編集したい
    return data.runs.filter(
      (run) => run.status === "step1_done" || run.status === "step2_confirmed",
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

  const issueCount = runDetail?.items.filter((item) => item.issue_flag).length ?? 0;
  const excludedCount = runDetail?.items.filter((item) => !item.issue_flag).length ?? 0;
  const errorCount =
    runDetail?.items.filter((item) => item.last_error_code || item.last_error_message).length ?? 0;
  const selectedItem = runDetail?.items.find((item) => item.id === selectedItemId) ?? null;

  return (
    <PageContainer>
      <PageHeader
        title="Step2: 発行対象の選択"
        subtitle="発行対象アイテムを選択します（このStepのみ）"
      />

      <div className="space-y-4">
        <div className="flex justify-between gap-4">
          <div className="w-full max-w-sm">
            <Select
              value={selectedRunIdValue ? String(selectedRunIdValue) : ""}
              onValueChange={(value) => setSelectedRunId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="対象Run候補を選択" />
              </SelectTrigger>
              <SelectContent>
                {checkRuns.map((run) => (
                  <SelectItem key={run.id} value={String(run.id)}>
                    {run.data_start_date && run.data_end_date
                      ? `${run.data_start_date} 〜 ${run.data_end_date} (#${run.id})`
                      : `Run #${run.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}>
            <Button variant="outline">メニューへ戻る</Button>
          </Link>
        </div>

        <div className="rounded-md border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div>
              選択中: <span className="font-semibold text-gray-900">{issueCount}件</span>
            </div>
            <div>
              除外: <span className="font-semibold text-gray-900">{excludedCount}件</span>
            </div>
            <div>
              重要エラー: <span className="font-semibold text-gray-900">{errorCount}件</span>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-white shadow-sm">
          <div className="border-b bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900">発行対象の選択</h3>
            <p className="text-sm text-gray-500">
              チェックを付けたアイテムのみがStep3対象になります。
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">選択</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>仕入先</TableHead>
                <TableHead>納品書</TableHead>
                <TableHead>対象期間</TableHead>
                <TableHead>メモ/警告</TableHead>
                <TableHead className="text-right">詳細</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runDetail?.items?.length ? (
                runDetail.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={item.issue_flag}
                        onCheckedChange={(checked) =>
                          updateItemMutation.mutate({
                            itemId: item.id,
                            data: { issue_flag: checked === true },
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>{item.row_no}</TableCell>
                    <TableCell>
                      <Badge variant={item.issue_flag ? "default" : "secondary"}>
                        {item.issue_flag ? "OK" : "除外"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.layer_code ?? "-"}</TableCell>
                    <TableCell>{item.item_no ?? "-"}</TableCell>
                    <TableCell>
                      {runDetail.data_start_date && runDetail.data_end_date
                        ? `${runDetail.data_start_date} 〜 ${runDetail.data_end_date}`
                        : "-"}
                    </TableCell>
                    <TableCell>{item.last_error_message ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedItemId(item.id)}
                        >
                          詳細 <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                        <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUN_DETAIL(runDetail.id)}>
                          <Button size="sm" variant="ghost">
                            全体
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                    対象Runを選択してください。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {selectedItem && (
          <div className="rounded-md border bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">選択アイテム詳細</h4>
              <Button size="sm" variant="ghost" onClick={() => setSelectedItemId(null)}>
                閉じる
              </Button>
            </div>
            <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <div>行番号: {selectedItem.row_no}</div>
              <div>納品書番号: {selectedItem.item_no ?? "-"}</div>
              <div>受発注No: {selectedItem.order_no ?? "-"}</div>
              <div>層別コード: {selectedItem.layer_code ?? "-"}</div>
              <div>次区コード: {selectedItem.jiku_code ?? "-"}</div>
              <div>納品予定日: {selectedItem.delivery_date ?? "-"}</div>
              <div>納入量: {selectedItem.delivery_quantity ?? "-"}</div>
              <div>エラー: {selectedItem.last_error_message ?? "-"}</div>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-3">
          <Button variant="outline">選択を保存</Button>
          <Button
            onClick={() => {
              if (!runDetail) return;
              completeMutation.mutate(undefined, {
                onSuccess: () => navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3_PLAN),
              });
            }}
            disabled={!runDetail}
          >
            選択した{issueCount}件で Step3へ進む
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
