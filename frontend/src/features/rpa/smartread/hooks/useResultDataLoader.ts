/**
 * Hook for loading result data (IDB cache -> API fallback)
 */

import { useState, useEffect } from "react";

import type { SmartReadValidationError } from "../api";
import { useSyncTaskResults } from "../hooks";

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

        // 1. IDBキャッシュから読み込み
        try {
          const { exportCache } = await import("../db/export-cache");
          const cached = await exportCache.getByTaskId(configId, taskId);
          if (cached && (cached.wide_data.length > 0 || cached.long_data.length > 0)) {
            console.info(`[useResultDataLoader] Loaded from IDB cache:`, {
              wide: cached.wide_data.length,
              long: cached.long_data.length,
            });
            setWideData(cached.wide_data);
            setLongData(cached.long_data);
            setTransformErrors(cached.errors);
            setFilename(cached.filename);
            setIsInitialLoading(false);
            return;
          }
        } catch (e) {
          console.warn(`[useResultDataLoader] Failed to load from cache:`, e);
        }

        // 2. キャッシュがない場合、APIから取得
        console.info(`[useResultDataLoader] No cache found, fetching from API...`);
        try {
          const result = await syncMutation.mutateAsync({ configId, taskId, forceSync: false });

          console.info(`[useResultDataLoader] API fetch result:`, {
            wide: result.wide_data.length,
            long: result.long_data.length,
            filename: result.filename,
          });

          setWideData(result.wide_data as Record<string, unknown>[]);
          setLongData(result.long_data as Record<string, unknown>[]);
          setTransformErrors(result.errors);
          setFilename(result.filename);
        } catch (error) {
          console.error(`[useResultDataLoader] Failed to fetch from API:`, error);
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
