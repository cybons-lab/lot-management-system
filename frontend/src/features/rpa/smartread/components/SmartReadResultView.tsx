/* eslint-disable max-lines-per-function, complexity */

import { Loader2, Download, AlertCircle, Database, RefreshCw } from "lucide-react";
import { useState } from "react";

import { useSmartReadLongData, downloadJson, downloadCsv, useSyncTaskResults } from "../hooks";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export function SmartReadResultView({ configId, taskId }: SmartReadResultViewProps) {
  const [activeTab, setActiveTab] = useState("long");

  // 同期結果（横持ち・縦持ち両方を含む）
  const [syncResult, setSyncResult] = useState<{
    wide_data: AnyRecord[];
    long_data: AnyRecord[];
    errors: { row: number; field: string; message: string; value: string | null }[];
    filename: string | null;
  } | null>(null);

  // Fetch data directly from DB (Unified flow)
  const {
    data: longData,
    isLoading,
    refetch,
    isRefetching,
  } = useSmartReadLongData(configId, taskId);
  const syncMutation = useSyncTaskResults();

  const handleSyncFromApi = async () => {
    // forceSync: true でキャッシュをスキップし、必ずサーバーから取得
    const result = await syncMutation.mutateAsync({ configId, taskId, forceSync: true });
    // 同期結果を保存して横持ちデータも表示可能にする
    setSyncResult({
      wide_data: result.wide_data as AnyRecord[],
      long_data: result.long_data as AnyRecord[],
      errors: result.errors,
      filename: result.filename,
    });
  };

  const handleDownloadLong = () => {
    const data = syncResult?.long_data ?? longData?.map((d) => d.content);
    if (!data || data.length === 0) return;
    downloadCsv(data, `${taskId}_long.csv`);
  };

  const handleDownloadWide = () => {
    if (!syncResult?.wide_data || syncResult.wide_data.length === 0) return;
    downloadCsv(syncResult.wide_data, `${taskId}_wide.csv`);
  };

  const handleDownloadJson = () => {
    const data = syncResult?.long_data ?? longData?.map((d) => d.content);
    if (!data || data.length === 0) return;
    downloadJson(data, `${taskId}.json`);
  };

  // Loading State
  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <div className="text-center">
            <p className="font-medium text-lg">データを取得中...</p>
            <p className="text-sm text-gray-400">データベースから取得しています</p>
          </div>
        </div>
      </Card>
    );
  }

  // No Data State
  if (!longData || longData.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <AlertCircle className="h-8 w-8" />
          <p>データが見つかりません</p>
          <p className="text-sm text-gray-400">
            まだ処理が完了していないか、データが存在しません。
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className={isRefetching ? "animate-spin mr-2" : "mr-2"} />
              再取得 (DB)
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSyncFromApi}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={syncMutation.isPending ? "animate-spin mr-2" : "mr-2"} />
              APIから同期
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // データ表示用：syncResult があればそれを優先、なければDB取得データを使用
  const displayLongData = syncResult?.long_data ?? longData.map((d) => d.content);
  const displayWideData = syncResult?.wide_data ?? [];
  const displayErrors =
    syncResult?.errors ??
    longData
      .filter((d) => d.status === "ERROR")
      .map((d) => ({
        row: d.row_index,
        field: "unknown",
        message: d.error_reason || "Unknown Error",
        value: "",
      }));

  // Result Display
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">処理結果</CardTitle>
              <Badge
                variant="secondary"
                className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100 flex gap-1 items-center"
              >
                <Database className="h-3 w-3" />
                {syncResult ? "API同期済み" : "DB取得済み"}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-2">
              <span>
                タスク: {taskId} (縦: {displayLongData.length}件, 横: {displayWideData.length}件)
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              title="DBから再取得"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncFromApi}
              disabled={syncMutation.isPending}
              title="APIから同期"
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              API同期
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadJson}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadWide}
              disabled={displayWideData.length === 0}
            >
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="px-4 border-b">
            <TabsList>
              <TabsTrigger value="long">縦持ち (Long) - {displayLongData.length}件</TabsTrigger>
              <TabsTrigger value="wide" disabled={displayWideData.length === 0}>
                横持ち (Wide) - {displayWideData.length}件
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            value="long"
            className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
          >
            <SmartReadCsvTable data={displayLongData} errors={displayErrors} />
          </TabsContent>
          <TabsContent
            value="wide"
            className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
          >
            {displayWideData.length > 0 ? (
              <SmartReadCsvTable data={displayWideData} errors={[]} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                横持ちデータはAPIから同期すると表示されます
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
