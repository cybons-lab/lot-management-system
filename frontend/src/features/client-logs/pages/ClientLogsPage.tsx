/**
 * ClientLogsPage
 * クライアントログ（フロントエンドエラーログ）一覧画面
 * Enhanced with filters, search, and better UX
 */

import { RefreshCw, AlertCircle, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { ClientLogsListParams } from "../api";
import { ClientLogDetailDialog } from "../components/ClientLogDetailDialog";
import { useClientLogs } from "../hooks";

import { Button, Badge, Input, Label } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { PageContainer, PageHeader } from "@/shared/components/layout";

type LogLevel = "error" | "warning" | "info" | string;
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
  username?: string | null;
  request_id?: string | null;
  created_at: string;
}

/* eslint-disable max-lines-per-function, complexity */
export function ClientLogsPage() {
  const [selectedLog, setSelectedLog] = useState<ClientLog | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter states
  const [selectedLevel, setSelectedLevel] = useState<"all" | "error" | "warning" | "info">("all");
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // Build query params
  const queryParams: ClientLogsListParams = {
    limit: 500,
    ...(selectedLevel !== "all" && { level: selectedLevel }),
    ...(appliedSearch && { search: appliedSearch }),
  };

  const { data: logs = [], isLoading, isError, refetch, isFetching } = useClientLogs(queryParams);

  // Column definitions
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
        cell: (row) => <Badge variant={getLevelBadgeVariant(row.level)}>{row.level}</Badge>,
        width: 80,
        sortable: true,
      },
      {
        id: "message",
        header: "メッセージ",
        accessor: (row) => row.message,
        cell: (row) => (
          <div
            className="max-w-2xl font-mono text-sm cursor-pointer hover:text-blue-600"
            title="クリックして全文表示"
          >
            {row.message.length > 150 ? row.message.substring(0, 150) + "..." : row.message}
          </div>
        ),
        sortable: true,
      },
      {
        id: "username",
        header: "ユーザー",
        accessor: (row) => row.username || "-",
        cell: (row) => <span>{row.username || "-"}</span>,
        width: 120,
        sortable: true,
      },
      {
        id: "created_at",
        header: "日時",
        accessor: (row) => row.created_at,
        cell: (row) => (
          <span className="text-gray-600">{new Date(row.created_at).toLocaleString("ja-JP")}</span>
        ),
        width: 180,
        sortable: true,
      },
    ],
    [],
  );

  const handleRowClick = (log: ClientLog) => {
    setSelectedLog(log);
    setIsDialogOpen(true);
  };

  const handleSearch = () => {
    setAppliedSearch(searchText);
  };

  const handleClearSearch = () => {
    setSearchText("");
    setAppliedSearch("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="クライアントログ"
        subtitle="フロントエンドエラーログ（システム管理者向け）"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            更新
          </Button>
        }
        className="pb-0"
      />

      {/* Filter Controls */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Level Filter */}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm font-medium mb-2 block">ログレベル</Label>
            <div className="flex gap-2">
              <Button
                variant={selectedLevel === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLevel("all")}
              >
                すべて
              </Button>
              <Button
                variant={selectedLevel === "error" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLevel("error")}
              >
                <Badge variant="destructive" className="mr-1">
                  error
                </Badge>
              </Button>
              <Button
                variant={selectedLevel === "warning" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLevel("warning")}
              >
                <Badge variant="secondary" className="mr-1">
                  warning
                </Badge>
              </Button>
              <Button
                variant={selectedLevel === "info" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLevel("info")}
              >
                <Badge variant="outline" className="mr-1">
                  info
                </Badge>
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <Label htmlFor="search" className="text-sm font-medium mb-2 block">
              メッセージ検索
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="search"
                  type="text"
                  placeholder="メッセージ内容で検索..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pr-8"
                />
                {searchText && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                検索
              </Button>
            </div>
          </div>
        </div>

        {appliedSearch && (
          <div className="text-sm text-gray-600">
            検索中: <span className="font-medium">&quot;{appliedSearch}&quot;</span>
          </div>
        )}
      </div>

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
          {appliedSearch || selectedLevel !== "all"
            ? "条件に一致するログが見つかりません"
            : "クライアントログが登録されていません"}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{logs.length} 件のログ（最大500件まで表示）</div>
          <DataTable
            data={logs}
            columns={columns}
            getRowId={(row) => row.id}
            onRowClick={handleRowClick}
            emptyMessage="クライアントログがありません"
          />
        </div>
      )}

      <ClientLogDetailDialog log={selectedLog} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </PageContainer>
  );
}
