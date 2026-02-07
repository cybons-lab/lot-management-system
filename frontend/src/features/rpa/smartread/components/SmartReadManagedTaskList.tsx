/**
 * SmartReadManagedTaskList
 * 管理タスク一覧（DB保存済みタスク）
 */

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { SmartReadTaskDetail } from "../api";
import { useManagedTasks, useSmartReadTasks, useUpdateSkipToday } from "../hooks";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Switch } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SmartReadManagedTaskListProps {
  configId: number | null;
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string) => void;
  onViewDetail?: () => void;
}

interface TaskTableProps {
  tasks: SmartReadTaskDetail[];
  onToggleSkipToday: (taskId: string, currentValue: boolean) => Promise<void>;
  updatingTaskId: string | null;
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string) => void;
}

function TaskTable({
  tasks,
  onToggleSkipToday,
  updatingTaskId,
  selectedTaskId,
  onSelectTask,
}: TaskTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>タスクID</TableHead>
            <TableHead>タスク名</TableHead>
            <TableHead>タスク日付</TableHead>
            <TableHead>状態</TableHead>
            <TableHead>今日スキップ</TableHead>
            <TableHead>作成日時</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-muted/50",
                selectedTaskId === task.task_id && "bg-muted",
              )}
              onClick={() => onSelectTask?.(task.task_id)}
            >
              <TableCell className="font-mono text-xs">{task.task_id}</TableCell>
              <TableCell>{task.name || "-"}</TableCell>
              <TableCell>{task.task_date}</TableCell>
              <TableCell>
                {task.state ? (
                  <Badge variant="outline">{task.state}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={task.skip_today}
                  onCheckedChange={() => onToggleSkipToday(task.task_id, task.skip_today)}
                  disabled={updatingTaskId === task.task_id}
                />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(task.created_at).toLocaleString("ja-JP")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const NoConfigState = () => (
  <Card className="h-full border-none shadow-none">
    <CardHeader>
      <CardTitle>タスク一覧</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">設定を選択してください</p>
    </CardContent>
  </Card>
);

const LoadingState = () => (
  <div className="flex h-full items-center justify-center">
    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const EmptyState = () => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
    <p>タスクがありません。「APIから同期」を押して最新データを取得してください。</p>
  </div>
);

export function SmartReadManagedTaskList({
  configId,
  selectedTaskId,
  onSelectTask,
  onViewDetail,
}: SmartReadManagedTaskListProps) {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading, refetch, isRefetching } = useManagedTasks(configId);
  const { refetch: syncFromApi, isFetching: isSyncing } = useSmartReadTasks(configId, false);
  const updateSkipTodayMutation = useUpdateSkipToday();
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const handleSync = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    console.info("[SmartRead] Starting manual task sync from API...");
    try {
      // 1. Fetch from API (internally saves to DB)
      await syncFromApi();

      // 2. Invalidate managed-tasks query to refresh list from DB
      await queryClient.invalidateQueries({
        queryKey: configId ? ["smartread", "configs", configId, "managed-tasks"] : [],
      });

      toast.success("最新のタスクを同期しました");
    } catch (e) {
      console.error("[SmartRead] Sync failed", e);
      toast.error("タスクの同期に失敗しました");
    }
  };

  const handleToggleSkipToday = async (taskId: string, currentValue: boolean) => {
    setUpdatingTaskId(taskId);
    try {
      await updateSkipTodayMutation.mutateAsync({ taskId, skipToday: !currentValue });
      refetch();
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (!configId) return <NoConfigState />;

  return (
    <Card className="h-full flex flex-col border-none shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-0 pt-0">
        <CardTitle className="text-base">タスク一覧</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isLoading || isRefetching || isSyncing}
        >
          <RefreshCw
            className={cn(
              "mr-2 h-4 w-4",
              (isLoading || isRefetching || isSyncing) && "animate-spin",
            )}
          />
          APIから同期
        </Button>
        <Button variant="default" size="sm" onClick={onViewDetail} disabled={!selectedTaskId}>
          詳細・ダウンロード
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
        {isLoading ? (
          <LoadingState />
        ) : !tasks || tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-full overflow-auto">
            <TaskTable
              tasks={tasks}
              onToggleSkipToday={handleToggleSkipToday}
              updatingTaskId={updatingTaskId}
              {...(selectedTaskId ? { selectedTaskId } : {})}
              {...(onSelectTask ? { onSelectTask } : {})}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
