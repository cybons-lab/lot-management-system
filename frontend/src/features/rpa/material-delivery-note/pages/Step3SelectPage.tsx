/**
 * Step3SelectPage
 * 素材納品書発行 Step3 - 実行可能なRun選択画面
 */

/* eslint-disable max-lines-per-function -- 論理的な画面単位を維持 */
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

export function Step3SelectPage() {
  const { data, isLoading, error } = useRuns(0, 100);

  const readyRuns = useMemo(() => {
    if (!data?.runs) return [];
    return data.runs.filter((run) => run.status === "ready_for_step2");
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
            <h3 className="font-medium text-gray-900">Step3実行待ち一覧</h3>
            <p className="text-sm text-gray-500">
              全アイテムのチェックが完了し、実行待ちのデータです。
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>取込日時</TableHead>
                <TableHead>実行ユーザー</TableHead>
                <TableHead>進捗</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    実行待ちのデータはありません。
                    <br />
                    Step1でCSVを取り込み、Step2で全ての項目を完了にしてください。
                  </TableCell>
                </TableRow>
              ) : (
                readyRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{run.id}</TableCell>
                    <TableCell>
                      <Badge variant="default">実行待ち</Badge>
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
                      <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUN_MONITOR(run.id)}>
                        <Button size="sm" className="gap-2">
                          詳細へ <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageContainer>
  );
}
