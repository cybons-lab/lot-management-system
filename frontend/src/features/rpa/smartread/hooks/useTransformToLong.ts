/**
 * Hook for transforming wide data to long data with DB save
 * Note: This is mainly for manual re-transformation if needed.
 * Normal flow uses backend's sync_task_results which auto-transforms.
 */

import { useState } from "react";
import { toast } from "sonner";

import { saveLongData } from "../api";
import type { SmartReadValidationError } from "../api";
import { SmartReadCsvTransformer } from "../utils/csv-transformer";

import { errorLogger } from "@/services/error-logger";

interface UseTransformToLongParams {
  configId: number;
  taskId: string;
  wideData: Record<string, unknown>[];
  filename: string | null;
  dataVersion: number | null;
  onSuccess: (longData: Record<string, unknown>[], errors: SmartReadValidationError[]) => void;
}

interface TransformData {
  configId: number;
  taskId: string;
  wideData: Record<string, unknown>[];
  longData: Record<string, unknown>[];
  errors: SmartReadValidationError[];
  filename: string | null;
  dataVersion: number | null;
}

async function cacheToIDB(data: TransformData): Promise<string | null> {
  try {
    const { exportCache } = await import("../db/export-cache");
    const exportId = `transform_${Date.now()}`;
    await exportCache.set({
      config_id: data.configId,
      task_id: data.taskId,
      export_id: exportId,
      wide_data: data.wideData,
      long_data: data.longData,
      errors: data.errors,
      filename: data.filename,
      data_version: data.dataVersion ?? 1,
      saved_to_db: false,
    });
    console.info(`[useTransformToLong] Cached transform result to IDB`);
    return `${data.configId}_${data.taskId}_${exportId}`;
  } catch (e) {
    console.warn(`[useTransformToLong] Failed to cache to IDB:`, e);
    return null;
  }
}

async function saveToDatabase(data: Omit<TransformData, "errors">): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const saveResponse = await saveLongData(data.taskId, {
    config_id: data.configId,
    task_id: data.taskId,
    task_date: today,
    data_version: data.dataVersion ?? 1,
    wide_data: data.wideData,
    long_data: data.longData,
    filename: data.filename,
  });

  console.info(
    `[useTransformToLong] Saved to DB: ${saveResponse.saved_wide_count} wide, ${saveResponse.saved_long_count} long`,
  );
  errorLogger.info("smartread_save_success", "DBへの保存成功", {
    configId: data.configId,
    taskId: data.taskId,
    savedWideCount: saveResponse.saved_wide_count,
    savedLongCount: saveResponse.saved_long_count,
  });
  toast.success(
    `変換完了: 横持ち${saveResponse.saved_wide_count}件、縦持ち${saveResponse.saved_long_count}件を保存しました`,
  );
}

export function useTransformToLong({
  configId,
  taskId,
  wideData,
  filename,
  dataVersion,
  onSuccess,
}: UseTransformToLongParams) {
  const [isTransforming, setIsTransforming] = useState(false);

  const transformToLong = async () => {
    if (wideData.length === 0) return;

    errorLogger.info("smartread_transform_start", "縦持ち変換開始", {
      configId,
      taskId,
      wideCount: wideData.length,
    });
    setIsTransforming(true);

    try {
      const transformer = new SmartReadCsvTransformer();
      const result = transformer.transformToLong(wideData, true);

      errorLogger.info("smartread_transform_complete", "縦持ち変換完了", {
        configId,
        taskId,
        wideCount: wideData.length,
        longCount: result.long_data.length,
        errorCount: result.errors.length,
      });

      // IDBキャッシュに保存
      const cacheId = await cacheToIDB({
        configId,
        taskId,
        wideData,
        longData: result.long_data,
        errors: result.errors,
        filename,
        dataVersion,
      });

      // DBに保存
      try {
        await saveToDatabase({
          configId,
          taskId,
          wideData,
          longData: result.long_data,
          filename,
          dataVersion,
        });
        if (cacheId) {
          const { exportCache } = await import("../db/export-cache");
          await exportCache.setSavedToDb(cacheId, true);
        }
      } catch (e) {
        console.error(`[useTransformToLong] Failed to save to DB:`, e);
        errorLogger.error("smartread_save_failed", e instanceof Error ? e : "DB保存失敗", {
          configId,
          taskId,
        });
        toast.error(
          `変換は成功しましたが、DBへの保存に失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`,
        );
      }

      // 成功時のコールバック
      onSuccess(result.long_data, result.errors);
    } catch (e) {
      console.error(`[useTransformToLong] Transform error:`, e);
      errorLogger.error("smartread_transform_failed", e instanceof Error ? e : "変換失敗", {
        configId,
        taskId,
        wideCount: wideData.length,
      });
      toast.error(`変換に失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`);
    } finally {
      setIsTransforming(false);
    }
  };

  return {
    transformToLong,
    isTransforming,
  };
}
