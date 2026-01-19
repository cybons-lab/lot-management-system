/**
 * SmartReadManagedTaskList
 * 管理タスク一覧（DB保存済みタスク）
 */

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import type { SmartReadTaskDetail } from "../api";
import { useManagedTasks, useUpdateSkipToday } from "../hooks";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Switch } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SmartReadManagedTaskListProps {
  configId: number | null;
}

interface TaskTableProps {
  tasks: SmartReadTaskDetail[];
  onToggleSkipToday: (taskId: string, currentValue: boolean) => Promise<void>;
  updatingTaskId: string | null;
}

function TaskTable({ tasks, onToggleSkipToday, updatingTaskId }: TaskTableProps) {
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
            <TableRow key={task.id}>
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
              <TableCell>
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

export function SmartReadManagedTaskList({ configId }: SmartReadManagedTaskListProps) {
  const { data: tasks, isLoading, refetch } = useManagedTasks(configId);
  const updateSkipTodayMutation = useUpdateSkipToday();
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const handleToggleSkipToday = async (taskId: string, currentValue: boolean) => {
    setUpdatingTaskId(taskId);
    try {
      await updateSkipTodayMutation.mutateAsync({ taskId, skipToday: !currentValue });
      refetch();
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (!configId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>管理タスク一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">設定を選択してください</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>管理タスク一覧</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          更新
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">管理タスクがありません</p>
        ) : (
          <TaskTable
            tasks={tasks}
            onToggleSkipToday={handleToggleSkipToday}
            updatingTaskId={updatingTaskId}
          />
        )}
      </CardContent>
    </Card>
  );
}
