import { AlertTriangle, CheckCircle2, Circle, Loader2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { getPadRunStepIndex, PAD_RUN_STEP_ORDER } from "@/features/rpa/smartread/utils/pad-run-steps";

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
        <div className="space-y-3">
          {runs.map((run) => {
            const stepIndex = getPadRunStepIndex(run.step);
            const isSucceeded = run.status === "SUCCEEDED";
            const isFailed = run.status === "FAILED" || run.status === "STALE";

            return (
              <div key={run.run_id} className="rounded border px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
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
                      {run.status === "RUNNING" && (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      )}
                      {run.status}
                    </span>
                    <span className="text-gray-500">Run: {run.run_id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{run.filenames ? `${run.filenames.length}ファイル` : "-"}</span>
                    {run.status === "SUCCEEDED" && (
                      <span className="text-green-600">
                        横: {run.wide_data_count} / 縦: {run.long_data_count}
                      </span>
                    )}
                    <span>{new Date(run.created_at).toLocaleTimeString("ja-JP")}</span>
                  </div>
                </div>

                <div className="mt-2 grid gap-1 text-xs text-gray-600">
                  {PAD_RUN_STEP_ORDER.map((step, index) => {
                    const isDone = isSucceeded || (stepIndex >= index && !isFailed);
                    const isActive = !isSucceeded && !isFailed && stepIndex === index;
                    const isErrorStep = isFailed && stepIndex === index;

                    return (
                      <div key={step.key} className="flex items-center gap-2">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : isErrorStep ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                        ) : (
                          <Circle className="h-3 w-3 text-gray-300" />
                        )}
                        <span className={isDone ? "text-gray-700" : ""}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
