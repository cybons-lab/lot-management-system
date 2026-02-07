import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";

import { httpPublic } from "@/shared/api/http-client";
import { authAwareRefetchInterval } from "@/shared/libs/query-utils";
import { cn } from "@/shared/libs/utils";

interface HealthResponse {
  status: string;
}

function useSystemHealthStatus() {
  const systemHealthQueryKey = ["system-health"] as const;
  const systemHealthQueryOptions = {
    queryKey: systemHealthQueryKey,
    queryFn: async (): Promise<HealthResponse> => {
      return httpPublic.get<HealthResponse>("readyz");
    },
  } satisfies UseQueryOptions<HealthResponse, Error, HealthResponse, typeof systemHealthQueryKey>;

  return useQuery({
    ...systemHealthQueryOptions,
    refetchInterval: authAwareRefetchInterval<HealthResponse, Error, HealthResponse>(30000), // Check every 30 seconds
    retry: 0, // Fail immediately so we can show error
    refetchOnWindowFocus: true,
  });
}

export function SystemStatus() {
  const [isDismissed, setIsDismissed] = useState(false);

  const { isError, error, refetch, isFetching } = useSystemHealthStatus();

  if (!isError) {
    return null;
  }

  if (isDismissed) {
    return null;
  }

  // Determine error message
  let errorMessage = "システムに接続できません";
  let detailMessage = "バックエンドサーバーが応答しないか、データベース接続に失敗しました。";

  if (error instanceof Error) {
    // Check for specific error types if possible, e.g. 500 vs Network Error
    // Use the HttpError type for better type checking
    interface HttpError {
      response?: { status?: number };
      code?: string;
    }
    const httpError = error as HttpError;
    if (httpError.response) {
      if (httpError.response.status === 500) {
        errorMessage = "データベース接続エラー";
        detailMessage = "データベースへの接続が失われました。システム管理者に連絡してください。";
      } else if (httpError.response.status === 502 || httpError.response.status === 503) {
        errorMessage = "サービス利用不可";
        detailMessage = "サーバーがメンテナンス中か、過負荷状態です。";
      }
    } else if (httpError.code === "ERR_NETWORK") {
      errorMessage = "ネットワークエラー";
      detailMessage = "サーバーに到達できません。インターネット接続を確認してください。";
    }
  }

  return (
    <div
      className={cn(
        "bg-destructive text-destructive-foreground fixed top-0 left-0 z-[100] w-full px-4 py-3 shadow-md transition-all duration-300",
        "flex items-center justify-between",
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 animate-pulse" />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="font-bold">{errorMessage}</span>
          <span className="hidden text-sm opacity-90 sm:inline">{detailMessage}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="hover:bg-destructive-foreground/10 rounded-full p-1 transition-colors disabled:opacity-50"
          title="再試行"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="border-destructive-foreground/30 hover:bg-destructive-foreground/10 rounded border px-2 py-1 text-xs transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
