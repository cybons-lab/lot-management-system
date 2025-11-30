import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui";

interface ErrorStateProps {
  error: Error | null;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  if (!error) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
      <div className="space-y-2 text-center">
        <p className="text-lg font-semibold text-red-900">データの取得に失敗しました</p>
        <p className="text-sm text-red-700">
          {error instanceof Error ? error.message : "サーバーエラーが発生しました"}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          再試行
        </Button>
      </div>
    </div>
  );
}
