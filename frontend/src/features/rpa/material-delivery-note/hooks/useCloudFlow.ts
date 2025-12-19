/**
 * Cloud Flow API hooks
 * ジョブキュー管理、設定管理用
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { http } from "@/shared/api/http-client";

// Types
interface CloudFlowJobCreate {
  job_type: string;
  start_date: string;
  end_date: string;
}

interface CloudFlowJobResponse {
  id: number;
  job_type: string;
  status: string;
  start_date: string;
  end_date: string;
  requested_by: string | null;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  result_message: string | null;
  error_message: string | null;
  position_in_queue: number | null;
}

interface CloudFlowQueueStatus {
  current_job: CloudFlowJobResponse | null;
  pending_jobs: CloudFlowJobResponse[];
  your_position: number | null;
}

// Query keys
const CLOUD_FLOW_KEYS = {
  all: ["cloud-flow"] as const,
  jobs: (jobType: string) => [...CLOUD_FLOW_KEYS.all, "jobs", jobType] as const,
  queueStatus: (jobType: string) => [...CLOUD_FLOW_KEYS.all, "queue-status", jobType] as const,
};

// Hooks
export function useCloudFlowQueueStatus(jobType: string) {
  return useQuery<CloudFlowQueueStatus>({
    queryKey: CLOUD_FLOW_KEYS.queueStatus(jobType),
    queryFn: async () => {
      return http.get<CloudFlowQueueStatus>(`rpa/cloud-flow/jobs/current?job_type=${jobType}`);
    },
    refetchInterval: 5000, // 5秒ごとに更新
  });
}

export function useCloudFlowJobHistory(jobType: string, limit = 20) {
  return useQuery<CloudFlowJobResponse[]>({
    queryKey: CLOUD_FLOW_KEYS.jobs(jobType),
    queryFn: async () => {
      return http.get<CloudFlowJobResponse[]>(
        `rpa/cloud-flow/jobs?job_type=${jobType}&limit=${limit}`,
      );
    },
  });
}

export function useCreateCloudFlowJob() {
  const queryClient = useQueryClient();

  return useMutation<CloudFlowJobResponse, Error, CloudFlowJobCreate>({
    mutationFn: async (data) => {
      return http.post<CloudFlowJobResponse>(`rpa/cloud-flow/jobs`, data);
    },
    onSuccess: (data) => {
      // キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: CLOUD_FLOW_KEYS.all });

      if (data.status === "pending") {
        toast.info(`実行を予約しました（待ち順番: ${data.position_in_queue}番目）`);
      } else {
        toast.success("実行を開始しました");
      }
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "実行予約に失敗しました";
      toast.error(message);
    },
  });
}
