/**
 * Hook for transforming wide data to long data with DB save
 */

import { useState } from "react";
import { toast } from "sonner";

import { saveLongData } from "../api";
import type { SmartReadValidationError } from "../api";
import { SmartReadCsvTransformer } from "../utils/csv-transformer";

interface UseTransformToLongParams {
  configId: number;
  taskId: string;
  wideData: Record<string, unknown>[];
  filename: string | null;
  onSuccess: (longData: Record<string, unknown>[], errors: SmartReadValidationError[]) => void;
}

export function useTransformToLong({
  configId,
  taskId,
  wideData,
  filename,
  onSuccess,
}: UseTransformToLongParams) {
  const [isTransforming, setIsTransforming] = useState(false);

  const transformToLong = async () => {
    if (wideData.length === 0) return;

    console.info(`[useTransformToLong] Transforming ${wideData.length} wide rows...`);
    setIsTransforming(true);

    try {
      const transformer = new SmartReadCsvTransformer();
      const result = transformer.transformToLong(wideData, true);

      console.info(`[useTransformToLong] Transform result: ${result.long_data.length} long rows`);

      // IDBキャッシュに保存
      try {
        const { exportCache } = await import("../db/export-cache");
        await exportCache.set({
          config_id: configId,
          task_id: taskId,
          export_id: `transform_${Date.now()}`,
          wide_data: wideData,
          long_data: result.long_data,
          errors: result.errors,
          filename: filename,
        });
        console.info(`[useTransformToLong] Cached transform result to IDB`);
      } catch (e) {
        console.warn(`[useTransformToLong] Failed to cache to IDB:`, e);
      }

      // DBに保存
      try {
        const today = new Date().toISOString().split("T")[0];

        const saveResponse = await saveLongData(taskId, {
          config_id: configId,
          task_id: taskId,
          task_date: today,
          wide_data: wideData,
          long_data: result.long_data,
          filename: filename,
        });

        console.info(
          `[useTransformToLong] Saved to DB: ${saveResponse.saved_wide_count} wide, ${saveResponse.saved_long_count} long`,
        );
        toast.success(
          `変換完了: 横持ち${saveResponse.saved_wide_count}件、縦持ち${saveResponse.saved_long_count}件を保存しました`,
        );
      } catch (e) {
        console.error(`[useTransformToLong] Failed to save to DB:`, e);
        toast.error(
          `変換は成功しましたが、DBへの保存に失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`,
        );
      }

      // 成功時のコールバック
      onSuccess(result.long_data, result.errors);
    } catch (e) {
      console.error(`[useTransformToLong] Transform error:`, e);
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
