import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Input, Label } from "@/components/ui";

interface ForecastImportFormProps {
  targetMonth: string;
  setTargetMonth: (val: string) => void;
  setFile: (file: File | null) => void;
  isPending: boolean;
  isError: boolean;
  error?: Error | null;
  isSuccess: boolean;
}

export function ForecastImportForm({
  targetMonth,
  setTargetMonth,
  setFile,
  isPending,
  isError,
  error,
  isSuccess,
}: ForecastImportFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="target-month">
          対象月
          <Input
            id="target-month"
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            disabled={isPending}
            className="mt-1"
          />
        </Label>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="csv-file">
          CSVファイル (ヘッダーなし)
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={isPending}
            className="mt-1"
          />
        </Label>
      </div>

      {isError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {error?.message || "インポートに失敗しました"}
        </div>
      )}

      {isSuccess && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          インポートが完了しました
        </div>
      )}
    </div>
  );
}
