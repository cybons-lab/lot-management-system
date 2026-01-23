import { Loader2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

interface PadRun {
  run_id: string;
  status: string;
  step: string;
  filenames: string[] | null;
  wide_data_count: number;
  long_data_count: number;
  created_at: string;
}

interface SmartReadPadRunStatusListProps {
  runs: PadRun[] | undefined;
}

export function SmartReadPadRunStatusList({ runs }: SmartReadPadRunStatusListProps) {
  if (!runs || runs.length === 0) return null;

  return (
    <Card className="shrink-0">
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm font-medium">PAD実行状態</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-2">
          {runs.slice(0, 3).map((run) => (
            <div
              key={run.run_id}
              className="flex items-center justify-between text-sm border rounded px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    run.status === "RUNNING"
                      ? "bg-blue-100 text-blue-800"
                      : run.status === "SUCCEEDED"
                        ? "bg-green-100 text-green-800"
                        : run.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {run.status === "RUNNING" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {run.status}
                </span>
                <span className="text-gray-500">Step: {run.step}</span>
              </div>
              <div className="flex items-center gap-4 text-gray-500">
                <span>{run.filenames ? `${run.filenames.length}ファイル` : "-"}</span>
                {run.status === "SUCCEEDED" && (
                  <span className="text-green-600">
                    横: {run.wide_data_count} / 縦: {run.long_data_count}
                  </span>
                )}
                <span className="text-xs">
                  {new Date(run.created_at).toLocaleTimeString("ja-JP")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
