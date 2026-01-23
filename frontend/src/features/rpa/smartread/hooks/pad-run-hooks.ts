/**
 * SmartRead PAD Runner Hooks
 *
 * PAD互換フロー（task→request→poll→export→download→CSV後処理）を
 * サーバ側で実行するためのTanStack Queryフック。
 *
 * See: docs/smartread/pad_runner_implementation_plan.md
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { startPadRun, getPadRuns, getPadRunStatus, retryPadRun } from "../api";

import { SMARTREAD_QUERY_KEYS } from "./query-keys";

import { authAwareRefetchInterval } from "@/shared/libs/query-utils";
import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

// ============================================
// PAD Run List Hook
// ============================================

/**
 * PAD互換フロー一覧を取得
 */
export function usePadRuns(configId: number | null, statusFilter?: string, limit: number = 20) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.padRuns(configId ?? 0),
    queryFn: async () => {
      if (!configId) return { runs: [] };
      return getPadRuns(configId, statusFilter, limit);
    },
    enabled: !!configId,
    staleTime: 1000 * 10, // 10 seconds (runs may be in progress)
    refetchInterval: authAwareRefetchInterval((query) => {
      // Auto-refresh if there are running tasks
      const data = query.state.data;
      if (data?.runs.some((r) => r.status === "RUNNING")) {
        return 5000; // 5 seconds
      }
      return false;
    }),
  });
}

// ============================================
// PAD Run Status Hook (with polling)
// ============================================

/**
 * PAD互換フロー状態を取得（STALE検出を含む）
 *
 * RUNNINGステータスの場合は自動ポーリングを行う。
 */
export function usePadRunStatus(configId: number | null, runId: string | null) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.padRun(configId ?? 0, runId ?? ""),
    queryFn: async () => {
      if (!configId || !runId) return null;
      return getPadRunStatus(configId, runId);
    },
    enabled: !!configId && !!runId,
    staleTime: 1000 * 5, // 5 seconds
    refetchInterval: authAwareRefetchInterval((query) => {
      // Auto-poll while running
      const data = query.state.data;
      if (data?.status === "RUNNING") {
        return 3000; // 3 seconds
      }
      return false;
    }),
  });
}

// ============================================
// Start PAD Run Mutation
// ============================================

/**
 * PAD互換フローを開始
 */
export function useStartPadRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, filenames }: { configId: number; filenames: string[] }) =>
      startPadRun(configId, filenames),
    onSuccess: (result, { configId }) => {
      toast.success(`PAD互換フローを開始しました (${result.run_id.slice(0, 8)}...)`);

      // Invalidate runs list
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.padRuns(configId) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.files(configId) });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`PAD互換フローの開始に失敗しました: ${message}`);
    },
  });
}

// ============================================
// Retry PAD Run Mutation
// ============================================

/**
 * 失敗/Staleの実行をリトライ
 */
export function useRetryPadRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, runId }: { configId: number; runId: string }) =>
      retryPadRun(configId, runId),
    onSuccess: (result, { configId, runId }) => {
      toast.success(`リトライを開始しました (${result.new_run_id.slice(0, 8)}...)`);

      // Invalidate both runs list and the old run status
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.padRuns(configId) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.padRun(configId, runId) });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`リトライに失敗しました: ${message}`);
    },
  });
}

// ============================================
// Convenience Hook: PAD Run with Auto-Polling
// ============================================

/**
 * PAD互換フローの状態を監視するユーティリティフック
 *
 * 使用例:
 * ```tsx
 * const { startRun, currentRun, isRunning } = usePadRunWorkflow(configId);
 *
 * // フローを開始
 * await startRun(["file1.pdf", "file2.pdf"]);
 *
 * // currentRun が自動更新される
 * if (currentRun?.status === "SUCCEEDED") {
 *   console.log(`完了: ${currentRun.wide_data_count} 件`);
 * }
 * ```
 */
export function usePadRunWorkflow(configId: number | null) {
  const startMutation = useStartPadRun();
  const retryMutation = useRetryPadRun();

  // Track the current run ID
  const currentRunId = startMutation.data?.run_id ?? null;

  // Fetch status for current run (auto-polling while RUNNING)
  const statusQuery = usePadRunStatus(configId, currentRunId);

  return {
    // Start a new run
    startRun: async (filenames: string[]) => {
      if (!configId) throw new Error("configId is required");
      return startMutation.mutateAsync({ configId, filenames });
    },

    // Retry a failed/stale run
    retryRun: async (runId: string) => {
      if (!configId) throw new Error("configId is required");
      return retryMutation.mutateAsync({ configId, runId });
    },

    // Current run status
    currentRunId,
    currentRun: statusQuery.data,

    // Loading states
    isStarting: startMutation.isPending,
    isRunning: statusQuery.data?.status === "RUNNING",
    isRetrying: retryMutation.isPending,

    // Error states
    startError: startMutation.error,
    statusError: statusQuery.error,
    retryError: retryMutation.error,

    // Reset state
    reset: () => {
      startMutation.reset();
      retryMutation.reset();
    },
  };
}
