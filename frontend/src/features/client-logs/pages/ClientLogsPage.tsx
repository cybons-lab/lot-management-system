/**
 * ClientLogsPage
 * クライアントログ(フロントエンドエラーログ)一覧画面
 * Terminal-style UI with filters and search
 */

import { RefreshCw, AlertCircle, Search, X } from "lucide-react";
import { useState } from "react";

import type { ClientLogsListParams } from "../api";
import { useClientLogs } from "../hooks";

import { Button, Badge, Input, Label } from "@/components/ui";
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

function LogEntryComponent({ log }: { log: ClientLog }) {
  const formattedTime = new Date(log.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="hover:bg-gray-800 p-2 rounded transition-colors">
      <div className="flex items-start gap-3">
        {/* Timestamp - Left side */}
        <span className="text-gray-400 text-xs whitespace-nowrap font-mono">{formattedTime}</span>

        {/* Level Badge */}
        <Badge variant={getLevelBadgeVariant(log.level)} className="text-xs shrink-0">
          {log.level}
        </Badge>

        {/* Username */}
        <span className="text-gray-400 text-xs whitespace-nowrap w-24 truncate">
          {log.username || "anonymous"}
        </span>

        {/* Message */}
        <span className="flex-1 break-words text-sm whitespace-pre-wrap">{log.message}</span>

        {/* ID */}
        <span className="text-gray-500 text-xs whitespace-nowrap">#{log.id}</span>
      </div>
    </div>
  );
}

/* eslint-disable max-lines-per-function, complexity -- 関連する画面ロジックを1箇所で管理するため */
export function ClientLogsPage() {
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
        subtitle="フロントエンドエラーログ(システム管理者向け)"
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
              <button
                onClick={() => setSelectedLevel("all")}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  selectedLevel === "all"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => setSelectedLevel("error")}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  selectedLevel === "error"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                error
              </button>
              <button
                onClick={() => setSelectedLevel("warning")}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  selectedLevel === "warning"
                    ? "bg-yellow-600 text-white border-yellow-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                warning
              </button>
              <button
                onClick={() => setSelectedLevel("info")}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  selectedLevel === "info"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                info
              </button>
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

      {/* Terminal-style log display */}
      {isLoading ? (
        <div className="rounded-lg border bg-gray-900 text-gray-100 p-8 text-center">
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
        <div className="rounded-lg border bg-gray-900 text-gray-400 p-8 text-center">
          {appliedSearch || selectedLevel !== "all"
            ? "条件に一致するログが見つかりません"
            : "クライアントログが登録されていません"}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">{logs.length} 件のログ(最大500件まで表示)</div>
          <div className="border rounded-lg bg-gray-900 text-gray-100 p-4 h-[600px] overflow-y-auto">
            <div className="space-y-1">
              {logs.map((log) => (
                <LogEntryComponent key={log.id} log={log} />
              ))}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
