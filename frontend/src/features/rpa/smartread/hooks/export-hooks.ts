/**
 * SmartRead Export Hooks
 *
 * エクスポート関連のフック。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SmartReadExport } from "../api";
import { createExport, getExportStatus, getExportCsvData } from "../api";

import { SMARTREAD_QUERY_KEYS } from "./query-keys";

import { authAwareRefetchInterval } from "@/shared/libs/query-utils";
import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

/**
 * エクスポートを作成
 */
export function useCreateExport() {
  return useMutation({
    mutationFn: ({
      configId,
      taskId,
      exportType = "csv",
    }: {
      configId: number;
      taskId: string;
      exportType?: string;
    }) => createExport(configId, taskId, exportType),
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`エクスポート作成に失敗しました: ${message}`);
    },
  });
}

/**
 * エクスポート状態を取得
 */
export function useExportStatus(
  configId: number | null,
  taskId: string | null,
  exportId: string | null,
  enabled: boolean = true,
) {
  const queryKey =
    configId && taskId && exportId
      ? ([...SMARTREAD_QUERY_KEYS.config(configId), "export", taskId, exportId] as const)
      : (["smartread", "export", "disabled"] as const);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<SmartReadExport | null> => {
      if (!configId || !taskId || !exportId) {
        return null;
      }
      return getExportStatus(configId, taskId, exportId);
    },
    enabled: !!configId && !!taskId && !!exportId && enabled,
    refetchInterval: authAwareRefetchInterval<SmartReadExport | null, Error, SmartReadExport | null>(
      (query) => {
      // RUNNING状態なら5秒ごとにポーリング
      const data = query.state.data;
      if (data && data.state === "RUNNING") {
        return 5000;
      }
      return false;
    }),
  });
}

/**
 * エクスポートからCSVデータを取得 (キャッシュファースト + クライアント側変換)
 * NOTE: enabled=false で定義し、明示的な refetch() で実行することを想定
 */
export function useExportCsvData(options: {
  configId: number | null;
  taskId: string | null;
  exportId: string | null;
  saveToDb?: boolean;
  taskDate?: string;
}) {
  const { configId, taskId, exportId, saveToDb = true, taskDate } = options;
  const queryKey =
    configId && taskId && exportId
      ? ([
          ...SMARTREAD_QUERY_KEYS.config(configId),
          "csv",
          taskId,
          exportId,
          saveToDb,
          taskDate,
        ] as const)
      : (["smartread", "csv", "disabled"] as const);

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!configId || !taskId || !exportId) {
        return null;
      }

      // 1. Check cache first
      try {
        const { exportCache } = await import("../db/export-cache");
        const cached = await exportCache.get(configId, taskId, exportId);

        if (cached) {
          return {
            wide_data: cached.wide_data,
            long_data: cached.long_data,
            errors: cached.errors,
            filename: cached.filename,
            source: "cache",
          };
        }
      } catch {
        // Cache check failed, proceed to server fetch
      }

      // 2. Fetch from server
      const serverData = await getExportCsvData({
        configId,
        taskId,
        exportId,
        saveToDb,
        taskDate,
      });

      // 3. Transform wide to long on client side
      const wideData = serverData.wide_data as Array<Record<string, any>>;
      const { SmartReadCsvTransformer } = await import("../utils/csv-transformer");
      const transformer = new SmartReadCsvTransformer();
      const transformResult = transformer.transformToLong(wideData, true);

      // 4. Cache the result
      try {
        const { exportCache } = await import("../db/export-cache");
        await exportCache.set({
          config_id: configId,
          task_id: taskId,
          export_id: exportId,
          wide_data: serverData.wide_data as Array<Record<string, any>>,
          long_data: transformResult.long_data,
          errors: transformResult.errors,
          filename: serverData.filename,
          task_date: taskDate,
          saved_to_db: saveToDb,
        });
      } catch {
        // Cache failed, continue without caching
      }

      return {
        wide_data: serverData.wide_data,
        long_data: transformResult.long_data,
        errors: transformResult.errors,
        filename: serverData.filename,
        source: "server",
      };
    },
    enabled: false, // Explicit trigger only
    staleTime: Infinity,
  });
}
