/**
 * ClientLogsPage
 * クライアントログ（フロントエンドエラーログ）一覧画面
 * Refactored to use DataTable component.
 */

import { RefreshCw, AlertCircle } from "lucide-react";
import { useMemo } from "react";

import { useClientLogs } from "../hooks";

import { Button, Badge } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

type LogLevel = "error" | "warning" | string;
type BadgeVariant = "destructive" | "secondary" | "outline";

function getLevelBadgeVariant(level: LogLevel): BadgeVariant {
  switch (level) {
    case "error":
      return "destructive";
    case "warning":
      return "secondary";
    default:
      return "outline";
  }
}

interface ClientLog {
  id: number;
  level: string;
  message: string;
  user_id?: number | null;
  created_at: string;
}

export function ClientLogsPage() {
  const {
    data: logs = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useClientLogs({ limit: 100 });

  // 列定義
  const columns = useMemo<Column<ClientLog>[]>(
    () => [
      {
        id: "id",
        header: "ID",
        accessor: (row) => row.id,
        width: 60,
        sortable: true,
      },
      {
        id: "level",
        header: "レベル",
        accessor: (row) => row.level,
        cell: (row) => (
          <Badge variant={getLevelBadgeVariant(row.level)}>{row.level}</Badge>
        ),
        width: 80,
        sortable: true,
      },
      {
        id: "message",
        header: "メッセージ",
        accessor: (row) => row.message,
        cell: (row) => (
          <div className="max-w-md truncate font-mono" title={row.message}>
            {row.message}
          </div>
        ),
        sortable: true,
      },
      {
        id: "user_id",
        header: "ユーザーID",
        accessor: (row) => row.user_id,
        cell: (row) => <span>{row.user_id ?? "-"}</span>,
        width: 100,
        sortable: true,
      },
      {
        id: "created_at",
        header: "日時",
        accessor: (row) => row.created_at,
        cell: (row) => (
          <span className="text-gray-600">
            {new Date(row.created_at).toLocaleString("ja-JP")}
          </span>
        ),
        width: 180,
        sortable: true,
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="クライアントログ"
        subtitle="フロントエンドエラーログを確認"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            更新
          </Button>
        }
        className="pb-0"
      />

      {/* Data display area */}
      {isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            データの取得に失敗しました
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          クライアントログが登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{logs.length} 件のログ</div>
          <DataTable
            data={logs}
            columns={columns}
            getRowId={(row) => row.id}
            emptyMessage="クライアントログがありません"
          />
        </div>
      )}
    </PageContainer>
  );
}
