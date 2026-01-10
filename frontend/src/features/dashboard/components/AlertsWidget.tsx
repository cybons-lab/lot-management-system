import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { http } from "@/shared/api/http-client";
import { AlertTable } from "@/shared/components/alerts/AlertTable";
import type { AlertItem } from "@/shared/types/alerts";

async function http_get_alerts() {
  return http.get<AlertItem[]>("alerts", {
    searchParams: { only_open: true, limit: 10 },
  });
}

export function AlertsWidget() {
  const {
    data: alerts,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["alerts", { only_open: true, limit: 10 }],
    queryFn: () => http_get_alerts(),
  });

  return (
    <Card className="col-span-1 h-full shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              アクティブなアラート
            </CardTitle>
            <CardDescription>対応が必要なシステム警告</CardDescription>
          </div>
          <Link
            to="/alerts"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            すべて見る
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
            <p className="mb-2 text-sm">アラートの取得に失敗しました</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1 h-3 w-3" />
              再試行
            </Button>
          </div>
        ) : (
          <AlertTable alerts={alerts || []} isLoading={isLoading} />
        )}
      </CardContent>
    </Card>
  );
}
