/**
 * 素材納品書発行の進捗チェックリスト表示コンポーネント
 *
 * Run Eventsから進捗状態を判定し、ステップごとのチェックリストを表示する。
 * SmartReadPadRunStatusListと同様のUIパターンを採用。
 */
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

function deriveRunState(status?: string) {
  return {
    isSucceeded: status === "SUCCEEDED" || status === "COMPLETED",
    isFailed: status === "FAILED" || status === "ERROR",
    isRunning: status === "RUNNING" || status === "IN_PROGRESS",
  };
}

function getStatusBadgeClass(runState: ReturnType<typeof deriveRunState>) {
  if (runState.isRunning) return "bg-blue-100 text-blue-800";
  if (runState.isSucceeded) return "bg-green-100 text-green-800";
  if (runState.isFailed) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

function StepStatusIcon({
  isDone,
  isErrorStep,
  isActive,
}: {
  isDone: boolean;
  isErrorStep: boolean;
  isActive: boolean;
}) {
  if (isDone) {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />;
  }
  if (isErrorStep) {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />;
  }
  if (isActive) {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />;
  }
  return <Circle className="h-3 w-3 shrink-0 text-gray-300" />;
}

function getStepLabelClass({
  isDone,
  isActive,
  isErrorStep,
}: {
  isDone: boolean;
  isActive: boolean;
  isErrorStep: boolean;
}) {
  if (isDone) return "text-gray-700";
  if (isActive) return "text-blue-700 font-medium";
  if (isErrorStep) return "text-red-700 font-medium";
  return "text-gray-500";
}

function StepProgressRow({
  label,
  isDone,
  isActive,
  isErrorStep,
}: {
  label: string;
  isDone: boolean;
  isActive: boolean;
  isErrorStep: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <StepStatusIcon isDone={isDone} isErrorStep={isErrorStep} isActive={isActive} />
      <span className={getStepLabelClass({ isDone, isActive, isErrorStep })}>{label}</span>
    </div>
  );
}

function RunStatusBadge({
  status,
  runState,
}: {
  status?: string;
  runState: ReturnType<typeof deriveRunState>;
}) {
  if (!status) return null;

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(runState)}`}
    >
      {runState.isRunning && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {status}
    </span>
  );
}

export function MaterialDeliveryRunProgress({
  runId,
  events,
  status,
  isLoading,
}: MaterialDeliveryRunProgressProps) {
  if (!runId || isLoading) {
    return null;
  }

  const currentStepIndex = getCurrentStepFromEvents(events);
  const runState = deriveRunState(status);

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-medium">実行進捗</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-1.5">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
            <span>Run ID: {runId}</span>
            <RunStatusBadge {...(status ? { status } : {})} runState={runState} />
          </div>

          <div className="grid gap-1.5 text-sm">
            {MATERIAL_DELIVERY_RUN_STEP_ORDER.map((step, index) => {
              const isDone =
                runState.isSucceeded || (currentStepIndex >= index && !runState.isFailed);
              const isActive = runState.isRunning && currentStepIndex === index;
              const isErrorStep = runState.isFailed && currentStepIndex === index;
              return (
                <StepProgressRow
                  key={step.key}
                  label={step.label}
                  isDone={isDone}
                  isActive={isActive}
                  isErrorStep={isErrorStep}
                />
              );
            })}
          </div>

          {events && events.length > 0 && (
            <div className="mt-2 border-t pt-2 text-xs text-gray-500">
              {events.length}件のイベント
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
