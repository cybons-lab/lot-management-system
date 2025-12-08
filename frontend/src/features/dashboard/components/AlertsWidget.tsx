import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTable } from "@/shared/components/alerts/AlertTable";
import { AlertItem } from "@/shared/types/alerts";

export function AlertsWidget() {
  const { data: alerts, isLoading } = useQuery({
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
        <AlertTable alerts={alerts || []} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}

// Inline fetcher because api properties might be missing typed getAlerts
// I should verify if api.getAlerts exists.
// Based on previous search, I didn't see it in api.ts, so I might need to add it or use http directly here.
import { http } from "@/shared/api/http-client";

async function http_get_alerts() {
  return http.get<AlertItem[]>("alerts", {
    searchParams: { only_open: true, limit: 10 },
  });
}
