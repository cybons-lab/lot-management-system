/* eslint-disable max-lines-per-function, complexity, @typescript-eslint/no-explicit-any */

import { Loader2, Download, AlertCircle, HardDrive, Cloud, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { type CachedExport, exportCache } from "../db/export-cache";
import {
  useCreateExport,
  useExportStatus,
  useExportCsvData,
  downloadJson,
  downloadCsv,
} from "../hooks";

import { SmartReadCsvTable } from "./SmartReadCsvTable";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
} from "@/components/ui";

interface SmartReadResultViewProps {
  configId: number;
  taskId: string;
}

export function SmartReadResultView({ configId, taskId }: SmartReadResultViewProps) {
  const [exportId, setExportId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("long");
  const [cachedData, setCachedData] = useState<CachedExport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const createExportMutation = useCreateExport();
  const { data: exportStatus } = useExportStatus(configId, taskId, exportId);

  // We only enable this query when we manually trigger refetch or when export is done
  const {
    data: fetchResult,
    isLoading: isCsvLoading,
    refetch: fetchCsv,
  } = useExportCsvData({
    configId,
    taskId,
    exportId,
    saveToDb: true,
  });

  // 1. Check cache on mount or taskId change
  useEffect(() => {
    let mounted = true;
    const checkCache = async () => {
      setCachedData(null);
      setExportId(null);
      setIsProcessing(false);

      console.info(`[SmartRead] Checking cache for task ${taskId}...`);
      const cached = await exportCache.getByTaskId(configId, taskId);

      if (mounted && cached) {
        console.info(`[SmartRead] Cache hit for task ${taskId}`);
        setCachedData(cached);
      } else {
        console.info(`[SmartRead] No cache found for task ${taskId}`);
      }
    };

    checkCache();
    return () => {
      mounted = false;
    };
  }, [configId, taskId]);

  // 2. Monitor Export Status
  useEffect(() => {
    if (exportId && (exportStatus?.state === "COMPLETED" || exportStatus?.state === "SUCCEEDED")) {
      console.info(`[SmartRead] Export completed for ${exportId}. Fetching CSV data...`);
      fetchCsv();
    } else if (exportStatus?.state === "FAILED") {
      setIsProcessing(false);
      console.error(`[SmartRead] Export failed for ${exportId}: ${exportStatus.error_message}`);
    }
  }, [exportStatus, exportId, fetchCsv]);

  // 3. Monitor CSV Fetch Result
  useEffect(() => {
    if (fetchResult) {
      console.info(`[SmartRead] CSV Data loaded active.`);
      setIsProcessing(false);
      // We don't need to manually set cachedData here because if we reload, the cache check will find it.
      // But for immediate display, we use fetchResult.
    }
  }, [fetchResult]);

  const handleProcessAndDownload = () => {
    console.info(`[SmartRead] Export requested for TaskID: ${taskId}`);
    setIsProcessing(true);
    createExportMutation.mutate(
      { configId, taskId },
      {
        onSuccess: (data) => {
          console.info(`[SmartRead] Export initialized. ID: ${data.export_id}`);
          setExportId(data.export_id);
          // Polling starts automatically via useExportStatus
        },
        onError: (error) => {
          console.error(`[SmartRead] Export initialization failed`, error);
          setIsProcessing(false);
        },
      },
    );
  };

  const currentData = cachedData || fetchResult;
  const dataSource = cachedData ? "cache" : fetchResult?.source || "server";

  const handleDownloadLong = () => {
    if (!currentData?.long_data || !currentData.filename) return;
    downloadCsv(currentData.long_data, `${currentData.filename}_long.csv`);
  };

  const handleDownloadWide = () => {
    if (!currentData?.wide_data || !currentData.filename) return;
    downloadCsv(currentData.wide_data, `${currentData.filename}_wide.csv`);
  };

  const handleDownloadJson = () => {
    // raw_dataがないためlong_dataを使用
    if (!currentData?.long_data || !currentData.filename) return;
    downloadJson(currentData.long_data, `${currentData.filename}.json`);
  };

  const handleManualTransform = async () => {
    if (!currentData?.wide_data) {
      console.warn("[SmartRead] No wide data to transform");
      return;
    }

    console.group("[SmartRead] Manual Transformation Triggered");
    console.info(`[SmartRead] Input Wide Data: ${currentData.wide_data.length} rows`);
    console.info(`[SmartRead] Sample Wide Data (Row 0):`, currentData.wide_data[0]);

    setIsProcessing(true);
    try {
      const { SmartReadCsvTransformer } = await import("../utils/csv-transformer");
      const transformer = new SmartReadCsvTransformer();
      const transformResult = transformer.transformToLong(
        currentData.wide_data as Array<Record<string, any>>,
        true,
      );

      console.info(`[SmartRead] Transformation Result:`, {
        longRows: transformResult.long_data.length,
        errors: transformResult.errors.length,
      });

      if (transformResult.long_data.length > 0) {
        console.info(`[SmartRead] Sample Long Data (Row 0):`, transformResult.long_data[0]);
      } else {
        console.warn(`[SmartRead] Resulting Long Data is EMPTY!`);
      }

      if (transformResult.errors.length > 0) {
        console.error(`[SmartRead] Transformation Errors:`, transformResult.errors);
      }

      const { exportCache } = await import("../db/export-cache");
      const timestamp = Date.now();
      const currentExportId = exportId || "manual";
      const cacheId = `${configId}_${taskId}_${currentExportId}`;

      // Create valid CachedExport object
      const newData: CachedExport = {
        id: cacheId,
        config_id: configId,
        task_id: taskId,
        export_id: currentExportId,
        wide_data: currentData.wide_data as Array<Record<string, any>>,
        long_data: transformResult.long_data,
        errors: transformResult.errors,
        filename: currentData.filename || "unknown",
        cached_at: timestamp,
      };

      await exportCache.set(newData);
      setCachedData(newData);
      toast.success(`変換完了: ${transformResult.long_data.length}件の明細 (キャッシュ保存)`);
    } catch (e) {
      console.error("[SmartRead] Manual Transformation Failed", e);
      toast.error("変換に失敗しました");
    } finally {
      setIsProcessing(false);
      console.groupEnd();
    }
  };

  // Loading / Processing State
  if (isProcessing || (exportId && (!exportStatus || exportStatus.state === "RUNNING"))) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <div className="text-center">
            <p className="font-medium text-lg">データを処理中...</p>
            <p className="text-sm text-gray-400">
              エクスポート作成 → データ取得 → 変換 → キャッシュ保存
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Error State
  if (exportStatus?.state === "FAILED") {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-red-500">
          <AlertCircle className="h-8 w-8" />
          <p>データ処理に失敗しました</p>
          <p className="text-sm text-gray-500">{exportStatus.error_message}</p>
          <Button variant="outline" size="sm" onClick={handleProcessAndDownload} className="mt-4">
            再試行
          </Button>
        </div>
      </Card>
    );
  }

  // Initial State (No cache, no processing)
  if (!currentData) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Download className="h-8 w-8 text-blue-500" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-lg">データをダウンロード</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              タスクのデータをサーバーから取得し、解析結果を表示します。
              <br />
              取得したデータはブラウザにキャッシュされます。
            </p>
          </div>
          <Button onClick={handleProcessAndDownload} size="lg" className="mt-2">
            <Play className="mr-2 h-4 w-4" />
            ダウンロード＆処理開始
          </Button>
        </div>
      </Card>
    );
  }

  // Result Display
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">処理結果</CardTitle>
              {dataSource === "cache" ? (
                <Badge
                  variant="secondary"
                  className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100 flex gap-1 items-center"
                >
                  <HardDrive className="h-3 w-3" />
                  キャッシュ済み
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="text-xs bg-green-100 text-green-800 hover:bg-green-100 flex gap-1 items-center"
                >
                  <Cloud className="h-3 w-3" />
                  サーバー取得
                </Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-2">
              {currentData.filename && <span>ファイル: {currentData.filename}</span>}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Manual Transform Button */}
            <Button variant="secondary" size="sm" onClick={() => handleManualTransform()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              縦持ち変換を実行
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadJson}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadWide}>
              <Download className="mr-2 h-4 w-4" />
              CSV(横)
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadLong}>
              <Download className="mr-2 h-4 w-4" />
              CSV(縦)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0 p-0">
        {isCsvLoading && !currentData ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="px-4 border-b">
              <TabsList>
                <TabsTrigger value="long">縦持ち (Long)</TabsTrigger>
                <TabsTrigger value="wide">横持ち (Wide)</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="long"
              className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
            >
              {currentData.long_data && (
                <SmartReadCsvTable data={currentData.long_data} errors={currentData.errors} />
              )}
            </TabsContent>
            <TabsContent
              value="wide"
              className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
            >
              {currentData.wide_data && (
                <SmartReadCsvTable data={currentData.wide_data} errors={currentData.errors} />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
