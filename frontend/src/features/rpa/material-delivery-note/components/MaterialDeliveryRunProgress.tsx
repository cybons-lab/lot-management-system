/**
 * 素材納品書発行の進捗チェックリスト表示コンポーネント
 *
 * Run Eventsから進捗状態を判定し、ステップごとのチェックリストを表示する。
 * SmartReadPadRunStatusListと同様のUIパターンを採用。
 */

/* eslint-disable max-lines-per-function, complexity -- 論理的な画面単位を維持 */
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  getCurrentStepFromEvents,
  MATERIAL_DELIVERY_RUN_STEP_ORDER,
} from "@/features/rpa/material-delivery-note/utils/run-steps";

interface RunEvent {
  id: number;
  run_id: number;
  event_type: string;
  message: string | null;
  created_at: string;
}

interface MaterialDeliveryRunProgressProps {
  /** Run ID */
  runId: number;
  /** Run Events（時系列順） */
  events: RunEvent[] | undefined;
  /** Run Status（RUNNING, SUCCEEDED, FAILED等） */
  status?: string;
  /** ローディング状態 */
  isLoading?: boolean;
}

export function MaterialDeliveryRunProgress({
  runId,
  events,
  status,
  isLoading,
}: MaterialDeliveryRunProgressProps) {
  // Run IDが未確定、またはイベントがない場合は非表示
  if (!runId || isLoading) {
    return null;
  }

  const currentStepIndex = getCurrentStepFromEvents(events);
  const isSucceeded = status === "SUCCEEDED" || status === "COMPLETED";
  const isFailed = status === "FAILED" || status === "ERROR";
  const isRunning = status === "RUNNING" || status === "IN_PROGRESS";

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">実行進捗</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-1.5">
          {/* Run ID と状態 */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Run ID: {runId}</span>
            {status && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  isRunning
                    ? "bg-blue-100 text-blue-800"
                    : isSucceeded
                      ? "bg-green-100 text-green-800"
                      : isFailed
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {isRunning && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {status}
              </span>
            )}
          </div>

          {/* 進捗ステップリスト */}
          <div className="grid gap-1.5 text-sm">
            {MATERIAL_DELIVERY_RUN_STEP_ORDER.map((step, index) => {
              // 完了済み: 成功した、または現在のステップより前（失敗していない場合）
              const isDone = isSucceeded || (currentStepIndex >= index && !isFailed);
              // アクティブ: 実行中で、現在のステップと一致
              const isActive = isRunning && currentStepIndex === index;
              // エラー: 失敗していて、現在のステップと一致
              const isErrorStep = isFailed && currentStepIndex === index;

              return (
                <div key={step.key} className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : isErrorStep ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                  ) : (
                    <Circle className="h-3 w-3 text-gray-300 shrink-0" />
                  )}
                  <span
                    className={
                      isDone
                        ? "text-gray-700"
                        : isActive
                          ? "text-blue-700 font-medium"
                          : isErrorStep
                            ? "text-red-700 font-medium"
                            : "text-gray-500"
                    }
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* イベント数表示 */}
          {events && events.length > 0 && (
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
              {events.length}件のイベント
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
