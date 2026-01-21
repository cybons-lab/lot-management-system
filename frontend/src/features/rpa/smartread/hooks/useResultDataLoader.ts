/**
 * Hook for loading result data (IDB cache -> API fallback)
 */

import { useState, useEffect } from "react";

import type { SmartReadValidationError } from "../api";
import { useSyncTaskResults } from "../hooks";

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

async function loadFromApi(
  configId: number,
  taskId: string,
  syncMutation: ReturnType<typeof useSyncTaskResults>,
): Promise<LoadDataResult> {
  console.info(`[useResultDataLoader] No cache found, fetching from API...`);
  errorLogger.info("smartread_api_fetch_start", "APIからデータ取得開始", {
    configId,
    taskId,
    forceSync: false,
  });

  const result = await syncMutation.mutateAsync({ configId, taskId, forceSync: false });

  console.info(`[useResultDataLoader] API fetch result:`, {
    wide: result.wide_data.length,
    long: result.long_data.length,
    filename: result.filename,
  });
  errorLogger.info("smartread_api_fetch_complete", "APIからデータ取得完了", {
    configId,
    taskId,
    wideCount: result.wide_data.length,
    longCount: result.long_data.length,
    filename: result.filename,
  });

  return {
    wideData: result.wide_data as Record<string, unknown>[],
    longData: result.long_data as Record<string, unknown>[],
    errors: result.errors,
    filename: result.filename,
  };
}

export function useResultDataLoader({ configId, taskId }: UseResultDataLoaderParams): ResultData {
  const [wideData, setWideData] = useState<Record<string, unknown>[]>([]);
  const [longData, setLongData] = useState<Record<string, unknown>[]>([]);
  const [transformErrors, setTransformErrors] = useState<SmartReadValidationError[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const syncMutation = useSyncTaskResults();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsInitialLoading(true);
        setLoadError(null);

        // Try cache first
        const cached = await loadFromCache(configId, taskId);
        if (cached) {
          setWideData(cached.wideData);
          setLongData(cached.longData);
          setTransformErrors(cached.errors);
          setFilename(cached.filename);
          setIsInitialLoading(false);
          return;
        }

        // Fallback to API
        try {
          const result = await loadFromApi(configId, taskId, syncMutation);
          setWideData(result.wideData);
          setLongData(result.longData);
          setTransformErrors(result.errors);
          setFilename(result.filename);
        } catch (error) {
          console.error(`[useResultDataLoader] Failed to fetch from API:`, error);
          errorLogger.error(
            "smartread_api_fetch_failed",
            error instanceof Error ? error : "API取得失敗",
            { configId, taskId },
          );
          setLoadError(error instanceof Error ? error.message : "データの取得に失敗しました");
        }
      } catch (error) {
        console.error(`[useResultDataLoader] Unexpected error:`, error);
        setLoadError(error instanceof Error ? error.message : "データの取得に失敗しました");
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
