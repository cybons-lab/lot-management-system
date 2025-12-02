/**
 * BulkImportResult
 * 一括インポート結果表示コンポーネント
 */

import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

import type { BulkUpsertResponse } from "@/shared/types/bulk-operations";

interface BulkImportResultProps {
  result: BulkUpsertResponse;
}

export function BulkImportResult({ result }: BulkImportResultProps) {
  const statusColors = {
    success: {
      bg: "bg-green-50",
      icon: <CheckCircle className="h-5 w-5 text-green-400" />,
      text: "text-green-800",
    },
    partial: {
      bg: "bg-yellow-50",
      icon: <AlertCircle className="h-5 w-5 text-yellow-400" />,
      text: "text-yellow-800",
    },
    failed: {
      bg: "bg-red-50",
      icon: <XCircle className="h-5 w-5 text-red-400" />,
      text: "text-red-800",
    },
  };

  const status = statusColors[result.status];
  const errors = result.errors;

  return (
    <div className="space-y-4">
      <div className={`rounded-md p-4 ${status.bg}`}>
        <div className="flex">
          <div className="flex-shrink-0">{status.icon}</div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${status.text}`}>インポート完了</h3>
            <div className="mt-2 text-sm">
              <p>
                総数: {result.summary.total} / 成功:{" "}
                {result.summary.created + result.summary.updated} / 失敗:{" "}
                {result.summary.failed}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* エラー詳細 */}
      {errors.length > 0 && (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-md border p-2">
          <p className="mb-2 text-sm font-medium text-gray-700">エラー詳細:</p>
          <ul className="space-y-1">
            {errors.slice(0, 50).map((error, i) => (
              <li key={i} className="flex items-start gap-1 text-xs text-red-600">
                <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
