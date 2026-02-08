import { Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/feedback/alert";
import { useExecutionQueue } from "@/hooks/useExecutionQueue";

interface ExecutionQueueBannerProps {
  resourceType: string;
  resourceId: string;
}

export const ExecutionQueueBanner: React.FC<ExecutionQueueBannerProps> = ({
  resourceType,
  resourceId,
}) => {
  const { data, cancelTask } = useExecutionQueue(resourceType, resourceId);

  if (!data) return null;

  const myPending = data.my_tasks.find((t) => t.status === "pending");
  const myRunning = data.my_tasks.find((t) => t.status === "running");
  const otherRunning =
    data.current_running_task && (!myRunning || data.current_running_task.id !== myRunning.id);

  if (myRunning) {
    return (
      <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-900">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertTitle className="ml-2">処理実行中</AlertTitle>
        <AlertDescription className="ml-2">あなたのタスクを実行中です...</AlertDescription>
      </Alert>
    );
  }

  if (myPending) {
    return (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50 text-yellow-900">
        <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
        <AlertTitle className="ml-2">処理待ち</AlertTitle>
        <AlertDescription className="flex items-center justify-between ml-2 w-full">
          <span>
            現在 {data.my_position} 番目で待機しています。 (全体待ち: {data.queue_length} 件)
            完了後に自動で開始します。
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-4 h-8 bg-white hover:bg-yellow-100 border-yellow-300 text-yellow-700"
            onClick={() => cancelTask(myPending.id)}
          >
            <XCircle className="mr-2 h-3 w-3" />
            キャンセル
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (otherRunning) {
    return (
      <Alert className="mb-4 border-gray-200 bg-gray-50 text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <AlertTitle className="ml-2">システム稼働中</AlertTitle>
        <AlertDescription className="ml-2">
          他のユーザーが処理を実行中です (Wait: {data.queue_length}{" "}
          tasks)。実行する場合はキューに追加されます。
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
