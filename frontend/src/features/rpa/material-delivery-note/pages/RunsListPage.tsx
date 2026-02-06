/**
 * RunsListPage
 * 素材納品書発行 履歴一覧
 */

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Loader2 } from "lucide-react";
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

type RunItem = NonNullable<ReturnType<typeof useRuns>["data"]>["runs"][number];

const STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" }
> = {
  step1_done: { label: "Step1完了", variant: "secondary" },
  step2_confirmed: { label: "Step2確認済", variant: "default" },
  step3_running: { label: "PAD実行中", variant: "outline" },
  step3_done: { label: "外部手順待ち", variant: "outline" },
  step4_checking: { label: "突合中", variant: "default" },
  step4_ng_retry: { label: "NG再実行中", variant: "destructive" },
  step4_review: { label: "レビュー中", variant: "default" },
  done: { label: "完了", variant: "success" },
  cancelled: { label: "キャンセル", variant: "destructive" },
};

function formatDate(dateText: string) {
  return format(new Date(dateText), "yyyy/MM/dd HH:mm", { locale: ja });
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || { label: status, variant: "outline" };
  const badgeVariant = config.variant === "success" ? "default" : config.variant;

  return (
    <Badge
      variant={badgeVariant}
      className={config.variant === "success" ? "bg-green-600 hover:bg-green-700" : ""}
    >
      {config.label}
    </Badge>
  );
}

function LoadingView() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return <div className="flex h-screen items-center justify-center text-red-500">{message}</div>;
}

function RunsTable({ runs }: { runs: RunItem[] }) {
  if (runs.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={7} className="text-center text-gray-500">
            履歴はありません
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {runs.map((run) => (
        <TableRow key={run.id}>
          <TableCell>{run.id}</TableCell>
          <TableCell>
            <StatusBadge status={run.status} />
          </TableCell>
          <TableCell>{formatDate(run.created_at)}</TableCell>
          <TableCell>{run.started_by_username || "-"}</TableCell>
          <TableCell>
            {run.complete_count} / {run.item_count}
            {run.all_items_complete && <span className="ml-2 text-green-600">✓</span>}
          </TableCell>
          <TableCell>{run.step2_executed_at ? formatDate(run.step2_executed_at) : "-"}</TableCell>
          <TableCell className="text-right">
            <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUN_MONITOR(run.id)}>
              <Button variant="ghost" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                監視
              </Button>
            </Link>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export function RunsListPage() {
  const { data, isLoading, error } = useRuns();

  if (isLoading) {
    return <LoadingView />;
  }

  if (error) {
    return <ErrorView message={`エラーが発生しました: ${error.message}`} />;
  }

  return (
    <PageContainer>
      <PageHeader title="実行履歴" subtitle="素材納品書発行の実行履歴一覧" />

      <div className="space-y-4">
        <div className="flex justify-end">
          <Link to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}>
            <Button variant="outline">メニューへ戻る</Button>
          </Link>
        </div>

        <div className="rounded-md border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>取込日時</TableHead>
                <TableHead>実行ユーザー</TableHead>
                <TableHead>件数 (完了/全件)</TableHead>
                <TableHead>Step2実行日時</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <RunsTable runs={data?.runs ?? []} />
          </Table>
        </div>
      </div>
    </PageContainer>
  );
}
