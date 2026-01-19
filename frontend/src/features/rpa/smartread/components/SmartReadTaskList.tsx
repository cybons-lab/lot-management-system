/* eslint-disable max-lines-per-function */
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CheckCircle, AlertCircle, Loader2, Clock, FileText } from "lucide-react";

import { useSmartReadTasks } from "../hooks";

import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SmartReadTaskListProps {
  configId: number | null;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

export function SmartReadTaskList({
  configId,
  selectedTaskId,
  onSelectTask,
}: SmartReadTaskListProps) {
  const { data: taskListResponse, isLoading } = useSmartReadTasks(configId);
  const tasks = taskListResponse?.tasks ?? [];

  if (!configId) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
        設定を選択してください
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
        履歴はありません
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col divide-y">
        {tasks.map((task) => (
          <div
            key={task.task_id}
            className={cn(
              "flex cursor-pointer flex-col gap-1 p-3 transition-colors hover:bg-gray-50",
              selectedTaskId === task.task_id && "bg-indigo-50 hover:bg-indigo-100",
            )}
            onClick={() => onSelectTask(task.task_id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelectTask(task.task_id);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate w-32" title={task.name ?? "Unknown"}>
                {task.name ?? "Unknown"}
              </span>
              {task.status === "DONE" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : task.status === "FAILED" ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {task.created_at
                    ? format(new Date(task.created_at), "MM/dd HH:mm", { locale: ja })
                    : "-"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{task.task_id.slice(0, 6)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
