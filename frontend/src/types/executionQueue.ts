export interface QueueEntryResponse {
  id: number;
  resource_type: string;
  resource_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  requested_by_user_id: number;
  parameters: Record<string, unknown>;
  priority: number;
  position: number | null;
  started_at: string | null;
  completed_at: string | null;
  heartbeat_at: string | null;
  timeout_seconds: number;
  result_message: string | null;
  error_message: string | null;
  created_at: string;
}

export interface QueueStatusResponse {
  resource_type: string;
  resource_id: string;
  current_running_task: QueueEntryResponse | null;
  queue_length: number;
  my_position: number | null;
  my_tasks: QueueEntryResponse[];
}
