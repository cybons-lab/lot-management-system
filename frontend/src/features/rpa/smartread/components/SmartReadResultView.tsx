/* eslint-disable max-lines-per-function */

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

export function SmartReadResultView({ configId, taskId }: SmartReadResultViewProps) {
  const [activeTab, setActiveTab] = useState("long");

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
    await syncMutation.mutateAsync({ configId, taskId, forceSync: true });
  };

  const handleDownloadLong = () => {
    if (!longData || longData.length === 0) return;
    downloadCsv(
      longData.map((d) => d.content),
      `${taskId}_long.csv`,
    );
  };

  const handleDownloadJson = () => {
    if (!longData || longData.length === 0) return;
    downloadJson(
      longData.map((d) => d.content),
      `${taskId}.json`,
    );
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
                DB取得済み
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-2">
              <span>
                タスク: {taskId} ({longData.length} 件)
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
            {/* Wide download disabled for now as we don't fetch wide data yet */}
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
              <TabsTrigger value="long">縦持ち (Long)</TabsTrigger>
              <TabsTrigger value="wide" disabled>
                横持ち (Wide)
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            value="long"
            className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
          >
            {longData && (
              <SmartReadCsvTable
                data={longData.map((d) => d.content)}
                errors={longData
                  .filter((d) => d.status === "ERROR")
                  .map((d) => ({
                    row: d.row_index,
                    field: "unknown",
                    message: d.error_reason || "Unknown Error",
                    value: "",
                  }))}
              />
            )}
          </TabsContent>
          <TabsContent
            value="wide"
            className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
          >
            <div className="flex items-center justify-center h-full text-gray-400">
              横持ちデータは現在表示できません
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
