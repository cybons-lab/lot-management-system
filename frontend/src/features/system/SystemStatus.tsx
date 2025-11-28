import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";

import { cn } from "@/shared/libs/utils";

interface HealthResponse {
    status: string;
}

export function SystemStatus() {
    const [isDismissed, setIsDismissed] = useState(false);

    const { isError, error, refetch, isFetching } = useQuery({
        queryKey: ["system-health"],
        queryFn: async () => {
            // Use fetch directly to bypass authentication interceptor
            const res = await fetch("/api/readyz");
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json() as Promise<HealthResponse>;
        },
        refetchInterval: 30000, // Check every 30 seconds
        retry: 0, // Fail immediately so we can show error
        refetchOnWindowFocus: true,
    });

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
        const httpError = error as HttpError;
        if (httpError.response) {
            if (httpError.response.status === 500) {
                errorMessage = "データベース接続エラー";
                detailMessage = "データベースへの接続が失われました。システム管理者に連絡してください。";
            } else if (
                httpError.response.status === 502 ||
                httpError.response.status === 503
            ) {
                errorMessage = "サービス利用不可";
                detailMessage = "サーバーがメンテナンス中か、過負荷状態です。";
            }
        } else if (httpError.code === "ERR_NETWORK") {
            errorMessage = "ネットワークエラー";
            detailMessage = "サーバーに到達できません。インターネット接続を確認してください。";
        }
    }

    return (
        <div className={cn(
            "fixed top-0 left-0 z-[100] w-full bg-destructive text-destructive-foreground px-4 py-3 shadow-md transition-all duration-300",
            "flex items-center justify-between"
        )}>
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="font-bold">{errorMessage}</span>
                    <span className="text-sm opacity-90 hidden sm:inline">{detailMessage}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-1 hover:bg-destructive-foreground/10 rounded-full transition-colors disabled:opacity-50"
                    title="再試行"
                >
                    <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                </button>
                <button
                    onClick={() => setIsDismissed(true)}
                    className="text-xs border border-destructive-foreground/30 px-2 py-1 rounded hover:bg-destructive-foreground/10 transition-colors"
                >
                    閉じる
                </button>
            </div>
        </div>
    );
}
