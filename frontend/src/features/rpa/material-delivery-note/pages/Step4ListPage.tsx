/**
 * Step4ListPage
 * 素材納品書発行 Step4 - レビュー・SAP登録一覧
 */

/* eslint-disable max-lines-per-function */
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Loader2, ArrowRight } from "lucide-react";
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
  { label: string; variant: "secondary" | "default" | "destructive" | "outline" }
> = {
  step3_done: { label: "外部手順待ち", variant: "outline" },
  step4_checking: { label: "突合中", variant: "default" },
  step4_ng_retry: { label: "NG再実行中", variant: "destructive" },
  step4_review: { label: "レビュー中", variant: "default" },
  done: { label: "完了", variant: "secondary" },
};

// Step4でアクセス可能なステータス
const STEP4_STATUSES = ["step3_done", "step4_checking", "step4_ng_retry", "step4_review", "done"];

export function Step4ListPage() {
  // 5秒ごとにポーリングして進捗を更新
  const { data, isLoading, error } = useRuns(0, 100, { refetchInterval: 5000 });

  const step4Runs = useMemo(
    () => data?.runs.filter((run) => STEP4_STATUSES.includes(run.status)) ?? [],
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
        title="Step4: レビュー・SAP登録"
        subtitle="突合完了後のデータをレビューし、SAP登録を行います"
      />

      <div className="space-y-4">
        <div className="flex justify-end">
          <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}>
            <Button variant="outline">メニューへ戻る</Button>
          </Link>
        </div>

        <div className="rounded-md border bg-white shadow-sm">
          <div className="border-b bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900">Step4 対象一覧</h3>
            <p className="text-sm text-gray-500">
              Step3完了後、レビュー・SAP登録が可能なデータです。
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>対象期間</TableHead>
                <TableHead>取込日時</TableHead>
                <TableHead>外部手順完了日時</TableHead>
                <TableHead>発行対象</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {step4Runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    Step4対象のデータはありません。
                    <br />
                    <span className="text-sm">Step3完了後にここに表示されます。</span>
                  </TableCell>
                </TableRow>
              ) : (
                step4Runs.map((run) => {
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
                      <TableCell>
                        {run.external_done_at ? (
                          format(new Date(run.external_done_at), "yyyy/MM/dd HH:mm", {
                            locale: ja,
                          })
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {run.issue_count} / {run.item_count} 件
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP4_DETAIL(run.id)}>
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
