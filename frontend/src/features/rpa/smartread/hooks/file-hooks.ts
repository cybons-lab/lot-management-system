/**
 * SmartRead File Hooks
 *
 * 監視フォルダ・ファイル処理関連のフック。
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SmartReadAnalyzeResponse } from "../api";
import {
  getWatchDirFiles,
  processWatchDirFiles,
  analyzeFile,
  transformCsv,
} from "../api";
import { SMARTREAD_QUERY_KEYS } from "./query-keys";

import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

/**
 * 監視フォルダ内のファイル一覧を取得
 */
export function useWatchDirFiles(configId: number | null) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.files(configId ?? 0),
    queryFn: () => (configId ? getWatchDirFiles(configId) : []),
    enabled: !!configId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * 監視フォルダ内のファイルを処理
 */
export function useProcessWatchDirFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, filenames }: { configId: number; filenames: string[] }) =>
      processWatchDirFiles(configId, filenames),
    onSuccess: (results: SmartReadAnalyzeResponse[], { configId }) => {
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        toast.success(`${successCount}件のファイルを処理しました`);
      } else {
        toast.warning(`${successCount}件成功、${failCount}件失敗`);
      }

      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.files(configId) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.tasks(configId) });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`処理に失敗しました: ${message}`);
    },
  });
}

/**
 * ファイルを解析 (アップロード用)
 */
export function useAnalyzeFile() {
  return useMutation({
    mutationFn: ({ configId, file }: { configId: number; file: File }) =>
      analyzeFile(configId, file),
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`解析に失敗しました: ${message}`);
    },
  });
}

/**
 * 横持ちデータを縦持ちに変換
 */
export function useTransformCsv() {
  return useMutation({
    mutationFn: ({
      wideData,
      skipEmpty = true,
    }: {
      wideData: Record<string, unknown>[];
      skipEmpty?: boolean;
    }) => transformCsv(wideData, skipEmpty),
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`変換に失敗しました: ${message}`);
    },
  });
}
