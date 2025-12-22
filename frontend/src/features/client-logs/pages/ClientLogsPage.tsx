/**
 * ClientLogsPage
 * クライアントログ（フロントエンドエラーログ）一覧画面
 */

import { RefreshCw, AlertCircle } from "lucide-react";

import { useClientLogs } from "../hooks";

import { Button, Badge } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";

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

function LogsTable({ logs }: { logs: ClientLog[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="w-[60px] px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
            <th className="w-[80px] px-4 py-3 text-left text-sm font-medium text-gray-700">
              レベル
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">メッセージ</th>
            <th className="w-[100px] px-4 py-3 text-left text-sm font-medium text-gray-700">
              ユーザーID
            </th>
            <th className="w-[180px] px-4 py-3 text-left text-sm font-medium text-gray-700">
              日時
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{log.id}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant={getLevelBadgeVariant(log.level)}>{log.level}</Badge>
              </td>
              <td className="max-w-md truncate px-4 py-3 font-mono text-sm" title={log.message}>
                {log.message}
              </td>
              <td className="px-4 py-3 text-sm">{log.user_id ?? "-"}</td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(log.created_at).toLocaleString("ja-JP")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ClientLogsPage() {
  const {
    data: logs = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useClientLogs({ limit: 100 });

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
          <LogsTable logs={logs} />
        </div>
      )}
    </PageContainer>
  );
}
