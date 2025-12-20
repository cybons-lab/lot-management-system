/**
 * Step2CheckListPage
 * 素材納品書発行 Step2 - 確認画面
 */

/* eslint-disable max-lines-per-function */
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowRight, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useRuns } from "../hooks";

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
  { label: string; variant: "secondary" | "default" | "destructive" }
> = {
  step1_done: { label: "Step2実行待ち", variant: "secondary" }, // 旧 downloaded
  step2_confirmed: { label: "確認完了", variant: "default" },
};

export function Step2CheckListPage() {
  const { data, isLoading, error } = useRuns(0, 100);

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

  return (
    <PageContainer>
      <PageHeader title="Step2: 内容確認" subtitle="取込データの詳細を確認・編集します" />

      <div className="space-y-4">
        <div className="flex justify-end">
          <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}>
            <Button variant="outline">メニューへ戻る</Button>
          </Link>
        </div>

        <div className="rounded-md border bg-white shadow-sm">
          <div className="border-b bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900">Step2 確認待ち一覧</h3>
            <p className="text-sm text-gray-500">
              ダウンロード済みで、確認・編集が必要なデータです。
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>取得期間</TableHead>
                <TableHead>取込日時</TableHead>
                <TableHead>実行ユーザー</TableHead>
                <TableHead>進捗</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    確認待ちのデータはありません。
                    <br />
                    Step1で進度実績をダウンロードしてください。
                  </TableCell>
                </TableRow>
              ) : (
                checkRuns.map((run) => {
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
                        {run.all_items_complete && <span className="ml-2 text-green-600">✓</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUN_DETAIL(run.id)}>
                          <Button size="sm" className="gap-2">
                            データ確認・編集 <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
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
