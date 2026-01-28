import { AlertTriangle } from "lucide-react";

export function StatsDisplay({
  dataTotal,
  errorCount,
  selectedCount,
}: {
  dataTotal?: number;
  errorCount: number;
  selectedCount: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">
        {dataTotal !== undefined && `${dataTotal}件のデータ`}
      </span>
      {errorCount > 0 && (
        <span className="text-sm text-red-600 font-medium flex items-center gap-1">
          <AlertTriangle className="h-4 w-4" />
          {errorCount}件のエラー
        </span>
      )}
      {selectedCount > 0 && (
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
          {selectedCount}件選択中
        </span>
      )}
    </div>
  );
}
