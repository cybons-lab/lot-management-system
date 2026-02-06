import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CheckCircle, AlertCircle, Loader2, Clock, FileText } from "lucide-react";

import { useSmartReadTasks } from "../hooks";
import type { SmartReadTask } from "../types";

import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SmartReadTaskListProps {
  configId: number | null;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
      {message}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function TaskStatusIcon({ status }: { status: string }) {
  if (status === "DONE") return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "FAILED") return <AlertCircle className="h-4 w-4 text-red-500" />;
  return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
}

function TaskListItem({
  task,
  isSelected,
  onSelectTask,
}: {
  task: SmartReadTask;
  isSelected: boolean;
  onSelectTask: (taskId: string) => void;
}) {
  const selectTask = () => onSelectTask(task.task_id);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") selectTask();
  };

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col gap-1 p-3 transition-colors hover:bg-gray-50",
        isSelected && "bg-indigo-50 hover:bg-indigo-100",
      )}
      onClick={selectTask}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between">
        <span className="w-32 truncate text-sm font-medium" title={task.name ?? "Unknown"}>
          {task.name ?? "Unknown"}
        </span>
        <TaskStatusIcon status={task.status} />
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
  );
}

export function SmartReadTaskList({
  configId,
  selectedTaskId,
  onSelectTask,
}: SmartReadTaskListProps) {
  // TaskListでは enabled=false (手動) だが、キャッシュがあれば表示される
  const { data: taskListResponse, isLoading, error } = useSmartReadTasks(configId, false);
  const tasks = taskListResponse?.tasks ?? [];

  console.log("[SmartReadTaskList] Render", {
    configId,
    isLoading,
    error,
    tasksLength: tasks.length,
  });
  if (error) {
    console.error("[SmartReadTaskList] Error fetching tasks:", error);
  }

  if (!configId) return <EmptyMessage message="設定を選択してください" />;
  if (isLoading) return <LoadingSkeleton />;
  if (!tasks || tasks.length === 0) return <EmptyMessage message="履歴はありません" />;

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col divide-y">
        {tasks.map((task) => (
          <TaskListItem
            key={task.task_id}
            task={task}
            isSelected={selectedTaskId === task.task_id}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
    </div>
  );
}
