/**
 * Hook for loading result data (IDB cache -> API fallback)
 */

import { useState, useEffect } from "react";

import { saveLongData, type SmartReadValidationError } from "../api";

import { errorLogger } from "@/services/error-logger";

interface UseResultDataLoaderParams {
  configId: number;
  taskId: string;
}

interface ResultData {
  wideData: Record<string, unknown>[];
  longData: Record<string, unknown>[];
  transformErrors: SmartReadValidationError[];
  filename: string | null;
  isInitialLoading: boolean;
  loadError: string | null;
  setWideData: (data: Record<string, unknown>[]) => void;
  setLongData: (data: Record<string, unknown>[]) => void;
  setTransformErrors: (errors: SmartReadValidationError[]) => void;
  setFilename: (filename: string | null) => void;
}

interface LoadDataResult {
  wideData: Record<string, unknown>[];
  longData: Record<string, unknown>[];
  errors: SmartReadValidationError[];
  filename: string | null;
  taskDate?: string;
  cacheId?: string;
  savedToDb?: boolean;
}

async function loadFromCache(configId: number, taskId: string): Promise<LoadDataResult | null> {
  try {
    const { exportCache } = await import("../db/export-cache");
    const cached = await exportCache.getByTaskId(configId, taskId);
    if (cached && (cached.wide_data.length > 0 || cached.long_data.length > 0)) {
      console.info(`[useResultDataLoader] Loaded from IDB cache:`, {
        wide: cached.wide_data.length,
        long: cached.long_data.length,
      });
      errorLogger.info("smartread_load_from_cache", "IDBキャッシュからデータ読み込み", {
        configId,
        taskId,
        wideCount: cached.wide_data.length,
        longCount: cached.long_data.length,
      });
      return {
        wideData: cached.wide_data,
        longData: cached.long_data,
        errors: cached.errors,
        filename: cached.filename,
        taskDate: cached.task_date,
        cacheId: cached.id,
        savedToDb: cached.saved_to_db,
      };
    }
  } catch (e) {
    console.warn(`[useResultDataLoader] Failed to load from cache:`, e);
    errorLogger.warning(
      "smartread_cache_load_failed",
      e instanceof Error ? e : "キャッシュ読み込み失敗",
      { configId, taskId },
    );
  }
  return null;
}

async function saveCacheToDatabase(params: {
  configId: number;
  taskId: string;
  wideData: Record<string, unknown>[];
  longData: Record<string, unknown>[];
  filename: string | null;
  taskDate?: string;
  cacheId: string;
}) {
  const { configId, taskId, wideData, longData, filename, taskDate, cacheId } = params;
  const { exportCache } = await import("../db/export-cache");
  try {
    const dateToUse = taskDate || new Date().toISOString().split("T")[0];
    await saveLongData(taskId, {
      config_id: configId,
      task_id: taskId,
      task_date: dateToUse,
      wide_data: wideData,
      long_data: longData,
      filename,
    });
    await exportCache.setSavedToDb(cacheId, true);
    errorLogger.info("smartread_cache_save_success", "キャッシュデータをDBに保存", {
      configId,
      taskId,
      wideCount: wideData.length,
      longCount: longData.length,
    });
  } catch (error) {
    console.error(`[useResultDataLoader] Failed to save cache to DB:`, error);
    errorLogger.error(
      "smartread_cache_save_failed",
      error instanceof Error ? error : "キャッシュDB保存失敗",
      { configId, taskId },
    );
  }
}

export function useResultDataLoader({ configId, taskId }: UseResultDataLoaderParams): ResultData {
  const [wideData, setWideData] = useState<Record<string, unknown>[]>([]);
  const [longData, setLongData] = useState<Record<string, unknown>[]>([]);
  const [transformErrors, setTransformErrors] = useState<SmartReadValidationError[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsInitialLoading(true);
        setLoadError(null);

        // タスク選択時はキャッシュのみ表示、自動APIコールはしない
        const cached = await loadFromCache(configId, taskId);
        if (cached) {
          setWideData(cached.wideData);
          setLongData(cached.longData);
          setTransformErrors(cached.errors);
          setFilename(cached.filename);
          if (cached.cacheId && cached.savedToDb === false) {
            void saveCacheToDatabase({
              configId,
              taskId,
              wideData: cached.wideData,
              longData: cached.longData,
              filename: cached.filename,
              taskDate: cached.taskDate,
              cacheId: cached.cacheId,
            });
          }
        } else {
          // キャッシュが無い場合は空状態で表示、API同期は手動ボタンから
          console.info(`[useResultDataLoader] No cache found. Manual sync required.`);
          errorLogger.info("smartread_no_cache", "キャッシュなし、手動同期が必要", {
            configId,
            taskId,
          });
        }
      } catch (error) {
        console.error(`[useResultDataLoader] Unexpected error:`, error);
        setLoadError(error instanceof Error ? error.message : "データの取得に失敗しました");
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, [configId, taskId]);

  return {
    wideData,
    longData,
    transformErrors,
    filename,
    isInitialLoading,
    loadError,
    setWideData,
    setLongData,
    setTransformErrors,
    setFilename,
  };
}
