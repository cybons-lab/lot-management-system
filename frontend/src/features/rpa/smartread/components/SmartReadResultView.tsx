/* eslint-disable max-lines-per-function */

import { Download, AlertCircle, RefreshCw, ArrowRightLeft } from "lucide-react";
import { useState, useEffect } from "react";

import { downloadJson, downloadCsv, useSyncTaskResults } from "../hooks";
import { SmartReadCsvTransformer } from "../utils/csv-transformer";

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
  const [activeTab, setActiveTab] = useState("wide");

  // 横持ちデータ（API/IDBから）
  const [wideData, setWideData] = useState<AnyRecord[]>([]);
  // 縦持ちデータ（変換後）
  const [longData, setLongData] = useState<AnyRecord[]>([]);
  // 変換エラー
  const [transformErrors, setTransformErrors] = useState<
    { row: number; field: string; message: string; value: string | null }[]
  >([]);
  // ファイル名
  const [filename, setFilename] = useState<string | null>(null);
  // 変換中フラグ
  const [isTransforming, setIsTransforming] = useState(false);

  const syncMutation = useSyncTaskResults();

  // API同期して横持ちデータを取得
  const handleSyncFromApi = async () => {
    console.info(`[ResultView] Triggering API sync for task ${taskId}...`);
    const result = await syncMutation.mutateAsync({ configId, taskId, forceSync: true });

    console.info(`[ResultView] Sync result:`, {
      wide: result.wide_data.length,
      long: result.long_data.length,
      filename: result.filename,
    });

    // stateを更新
    setWideData(result.wide_data as AnyRecord[]);
    setLongData(result.long_data as AnyRecord[]);
    setTransformErrors(result.errors);
    setFilename(result.filename);

    // 横持ちがあれば横持ちタブ、縦持ちがあれば縦持ちタブに切り替え
    if (result.long_data.length > 0) {
      setActiveTab("long");
    } else if (result.wide_data.length > 0) {
      setActiveTab("wide");
    }
  };

  // 横持ち→縦持ち変換
  const handleTransformToLong = async () => {
    if (wideData.length === 0) return;

    console.info(`[ResultView] Transforming ${wideData.length} wide rows...`);
    setIsTransforming(true);

    try {
      const transformer = new SmartReadCsvTransformer();
      const result = transformer.transformToLong(wideData, true);

      console.info(`[ResultView] Transform result: ${result.long_data.length} long rows`);

      setLongData(result.long_data);
      setTransformErrors(result.errors);
      setActiveTab("long");
    } catch (e) {
      console.error(`[ResultView] Transform error:`, e);
    } finally {
      setIsTransforming(false);
    }
  };

  const handleDownloadLong = () => {
    if (longData.length === 0) return;
    downloadCsv(longData, `${taskId}_long.csv`);
  };

  const handleDownloadWide = () => {
    if (wideData.length === 0) return;
    downloadCsv(wideData, `${taskId}_wide.csv`);
  };

  const handleDownloadJson = () => {
    if (longData.length === 0) return;
    downloadJson(longData, `${taskId}.json`);
  };

  // IDBからキャッシュを読み込む (初回マウント時)
  useEffect(() => {
    const loadFromCache = async () => {
      try {
        const { exportCache } = await import("../db/export-cache");
        const cached = await exportCache.getByTaskId(configId, taskId);
        if (cached) {
          console.info(`[ResultView] Loaded from IDB cache:`, {
            wide: cached.wide_data.length,
            long: cached.long_data.length,
          });
          setWideData(cached.wide_data);
          setLongData(cached.long_data);
          setTransformErrors(cached.errors);
          setFilename(cached.filename);
          if (cached.long_data.length > 0) {
            setActiveTab("long");
          }
        }
      } catch (e) {
        console.warn(`[ResultView] Failed to load from cache:`, e);
      }
    };
    loadFromCache();
  }, [configId, taskId]);

  // No Data State
  if (wideData.length === 0 && longData.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <AlertCircle className="h-8 w-8" />
          <p>データが見つかりません</p>
          <p className="text-sm text-gray-400">
            「APIから同期」ボタンで横持ちデータを取得してください。
          </p>
          <div className="flex gap-2 mt-4">
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
                className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100"
              >
                横: {wideData.length}件 / 縦: {longData.length}件
              </Badge>
            </div>
            <CardDescription>{filename && <span>ファイル: {filename}</span>}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncFromApi}
              disabled={syncMutation.isPending}
              title="APIから再取得"
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              API同期
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJson}
              disabled={longData.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadWide}
              disabled={wideData.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV(横)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadLong}
              disabled={longData.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV(縦)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0 p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="px-4 border-b flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="wide">横持ち (Wide) - {wideData.length}件</TabsTrigger>
              <TabsTrigger value="long">縦持ち (Long) - {longData.length}件</TabsTrigger>
            </TabsList>
            {activeTab === "wide" && wideData.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleTransformToLong}
                disabled={isTransforming}
                className="my-2"
              >
                <ArrowRightLeft
                  className={`h-4 w-4 mr-1 ${isTransforming ? "animate-spin" : ""}`}
                />
                縦持ちに変換
              </Button>
            )}
          </div>
          <TabsContent
            value="wide"
            className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
          >
            {wideData.length > 0 ? (
              <SmartReadCsvTable data={wideData} errors={[]} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                横持ちデータがありません
              </div>
            )}
          </TabsContent>
          <TabsContent
            value="long"
            className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
          >
            {longData.length > 0 ? (
              <SmartReadCsvTable data={longData} errors={transformErrors} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <p>縦持ちデータがありません</p>
                {wideData.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleTransformToLong}>
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    横持ちから変換
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
