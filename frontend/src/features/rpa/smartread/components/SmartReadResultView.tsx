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

// ヘッダー表示用コンポーネント
function ResultHeader({
  isLoading,
  wideCount,
  longCount,
  filename,
  error,
  onSync,
  onDownloadJson,
  onDownloadWide,
  onDownloadLong,
  isSyncing,
}: {
  isLoading: boolean;
  wideCount: number;
  longCount: number;
  filename: string | null;
  error: string | null;
  onSync: () => void;
  onDownloadJson: () => void;
  onDownloadWide: () => void;
  onDownloadLong: () => void;
  isSyncing: boolean;
}) {
  return (
    <CardHeader className="py-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">処理結果</CardTitle>
            {isLoading ? (
              <Badge
                variant="secondary"
                className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-100"
              >
                読み込み中...
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100"
              >
                横: {wideCount}件 / 縦: {longCount}件
              </Badge>
            )}
          </div>
          <CardDescription>
            {filename ? (
              <span>ファイル: {filename}</span>
            ) : error ? (
              <span className="text-red-600">エラー: {error}</span>
            ) : isLoading ? (
              <span className="text-gray-500">データを読み込んでいます...</span>
            ) : (
              <span className="text-gray-400">ファイル情報なし</span>
            )}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing || isLoading}
            title="APIから再取得"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing || isLoading ? "animate-spin" : ""}`} />
            API同期
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadJson}
            disabled={longCount === 0 || isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadWide}
            disabled={wideCount === 0 || isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV(横)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadLong}
            disabled={longCount === 0 || isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV(縦)
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}

// タブコンテンツの表示用コンポーネント
function TabContentDisplay({
  isLoading,
  hasError,
  errorMessage,
  data,
  errors,
  dataType,
  onRetry,
  onTransform,
  canTransform,
}: {
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  data: AnyRecord[];
  errors: { row: number; field: string; message: string; value: string | null }[];
  dataType: "wide" | "long";
  onRetry: () => void;
  onTransform?: () => void;
  canTransform?: boolean;
}) {
  const label = dataType === "wide" ? "横持ち" : "縦持ち";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <RefreshCw className="animate-spin mr-2 h-5 w-5" />
        <span>{label}データを読み込んでいます...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-red-600">データの取得に失敗しました</p>
        <p className="text-sm text-gray-400">{errorMessage}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-1" />
          再試行
        </Button>
      </div>
    );
  }

  if (data.length > 0) {
    return <SmartReadCsvTable data={data} errors={errors} />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
      <AlertCircle className="h-8 w-8" />
      <p>{label}データがありません</p>
      {dataType === "wide" ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-1" />
          APIから同期
        </Button>
      ) : (
        canTransform &&
        onTransform && (
          <Button variant="outline" size="sm" onClick={onTransform}>
            <ArrowRightLeft className="h-4 w-4 mr-1" />
            横持ちから変換
          </Button>
        )
      )}
    </div>
  );
}

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
  // 初期ロード状態
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  // 初回マウント時に自動でデータを取得（IDB → API）
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
            setIsInitialLoading(false);
            return; // キャッシュがあれば完了
          }
        } catch (e) {
          console.warn(`[ResultView] Failed to load from cache:`, e);
        }

        // 2. キャッシュがない場合、APIから取得
        console.info(`[ResultView] No cache found, fetching from API...`);
        try {
          const result = await syncMutation.mutateAsync({ configId, taskId, forceSync: false });

          console.info(`[ResultView] API fetch result:`, {
            wide: result.wide_data.length,
            long: result.long_data.length,
            filename: result.filename,
          });

          setWideData(result.wide_data as AnyRecord[]);
          setLongData(result.long_data as AnyRecord[]);
          setTransformErrors(result.errors);
          setFilename(result.filename);

          if (result.long_data.length > 0) {
            setActiveTab("long");
          } else if (result.wide_data.length > 0) {
            setActiveTab("wide");
          }
        } catch (error) {
          console.error(`[ResultView] Failed to fetch from API:`, error);
          setLoadError(error instanceof Error ? error.message : "データの取得に失敗しました");
        }
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId, taskId]);

  // ローディング中・エラー時・データなし時でもテーブル構造を維持

  // Result Display
  return (
    <Card className="h-full flex flex-col">
      <ResultHeader
        isLoading={isInitialLoading}
        wideCount={wideData.length}
        longCount={longData.length}
        filename={filename}
        error={loadError}
        onSync={handleSyncFromApi}
        onDownloadJson={handleDownloadJson}
        onDownloadWide={handleDownloadWide}
        onDownloadLong={handleDownloadLong}
        isSyncing={syncMutation.isPending}
      />
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
            <TabContentDisplay
              isLoading={isInitialLoading}
              hasError={!!loadError}
              errorMessage={loadError}
              data={wideData}
              errors={[]}
              dataType="wide"
              onRetry={handleSyncFromApi}
            />
          </TabsContent>
          <TabsContent
            value="long"
            className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
          >
            <TabContentDisplay
              isLoading={isInitialLoading}
              hasError={!!loadError}
              errorMessage={loadError}
              data={longData}
              errors={transformErrors}
              dataType="long"
              onRetry={handleSyncFromApi}
              onTransform={handleTransformToLong}
              canTransform={wideData.length > 0}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
