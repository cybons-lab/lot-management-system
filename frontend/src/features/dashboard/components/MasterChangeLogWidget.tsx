import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  AlertCircle,
  ArrowLeftRight,
  Database,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/services/api";
import type { MasterChangeLog } from "@/services/api";

export function MasterChangeLogWidget() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["masterChangeLogs", { limit: 20 }],
    queryFn: () => api.getMasterChangeLogs({ limit: 20 }),
  });

  return (
    <Card className="col-span-1 h-full shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Database className="h-5 w-5 text-slate-500" />
              マスタデータ変更履歴
            </CardTitle>
            <CardDescription>直近のマスタ変更アクティビティ</CardDescription>
          </div>
          <Link
            to="/admin/settings"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            すべて見る
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[350px]">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
              <p className="mb-2 text-sm">変更履歴の取得に失敗しました</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-1 h-3 w-3" />
                再試行
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex animate-pulse gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-slate-100" />
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data?.logs.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Database className="mb-2 h-10 w-10 opacity-20" />
              <p className="text-sm">変更履歴はありません</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.logs.map((log) => (
                <LogItem key={log.change_log_id} log={log} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function LogItem({ log }: { log: MasterChangeLog }) {
  const { icon, color_bg, color_text, label } = getChangeTypeConfig(log.change_type);

  return (
    <div className="flex items-start gap-4 p-4 transition-colors hover:bg-slate-50">
      <div className={`rounded-full p-2 ${color_bg} ${color_text} mt-0.5 shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-900">
            {formatTableName(log.table_name)}
          </p>
          <span className="text-xs whitespace-nowrap text-slate-400">
            {format(new Date(log.changed_at), "MM/dd HH:mm", { locale: ja })}
          </span>
        </div>
        <p className="text-xs text-slate-600">
          ID: {log.record_id} のレコードが
          <span className={`mx-1 font-medium ${color_text}`}>{label}</span>
          されました
        </p>
      </div>
    </div>
  );
}

function getChangeTypeConfig(type: string) {
  switch (type) {
    case "insert":
      return {
        icon: <Plus className="h-4 w-4" />,
        color_bg: "bg-emerald-50",
        color_text: "text-emerald-600",
        label: "作成",
      };
    case "delete":
      return {
        icon: <Trash2 className="h-4 w-4" />,
        color_bg: "bg-rose-50",
        color_text: "text-rose-600",
        label: "削除",
      };
    case "update":
    default:
      return {
        icon: <ArrowLeftRight className="h-4 w-4" />,
        color_bg: "bg-blue-50",
        color_text: "text-blue-600",
        label: "更新",
      };
  }
}

function formatTableName(name: string): string {
  const map: Record<string, string> = {
    products: "製品マスタ",
    suppliers: "サプライヤー",
    customers: "顧客マスタ",
    warehouses: "倉庫マスタ",
    lots: "ロット",
    orders: "受注",
  };
  return map[name] || name;
}
