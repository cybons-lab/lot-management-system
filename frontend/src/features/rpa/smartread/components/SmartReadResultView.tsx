/* eslint-disable max-lines-per-function */

import { Download, AlertCircle, RefreshCw, Database, Repeat, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { syncTaskResults } from "../api";
import { downloadJson, downloadCsv, useSyncTaskResults } from "../hooks";
import { useResultDataLoader } from "../hooks/useResultDataLoader";
import { useTransformToLong } from "../hooks/useTransformToLong";

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
// eslint-disable-next-line complexity
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
  onLoadFromDb,
  onTransformToLong,
  onSaveToDb,
  isTransforming,
  isSaving,
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
  onLoadFromDb: () => void;
  onTransformToLong: () => void;
  onSaveToDb: () => void;
  isTransforming: boolean;
  isSaving: boolean;
}) {
  const isDev = import.meta.env.DEV;
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
          {isDev ? (
            <>
              {/* 開発モード: デバッグ用ボタン */}
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadFromDb}
                disabled={isLoading}
                title="DBから横持ちデータを読み込み"
              >
                <Database className="h-4 w-4 mr-1" />
                DB読込
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onTransformToLong}
                disabled={wideCount === 0 || isTransforming}
                title="横持ちデータを縦持ちに変換"
              >
                <Repeat className={`h-4 w-4 mr-1 ${isTransforming ? "animate-spin" : ""}`} />
                縦変換
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveToDb}
                disabled={longCount === 0 || isSaving}
                title="縦持ちデータをDBに保存"
              >
                <Save className={`h-4 w-4 mr-1 ${isSaving ? "animate-spin" : ""}`} />
                DB保存
              </Button>
              <div className="border-r mx-1" />
            </>
          ) : (
            <>
              {/* 本番モード: API同期ボタン */}
              <Button
                variant="outline"
                size="sm"
                onClick={onSync}
                disabled={isSyncing || isLoading}
                title="SmartRead APIからデータを取得"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isSyncing || isLoading ? "animate-spin" : ""}`}
                />
                サーバー取得
              </Button>
            </>
          )}
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
}: {
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  data: AnyRecord[];
  errors: { row: number; field: string; message: string; value: string | null }[];
  dataType: "wide" | "long";
  onRetry: () => void;
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
      <p className="text-sm text-gray-500">
        {dataType === "wide"
          ? "APIから同期ボタンでデータを取得してください"
          : "横持ちデータの同期時に自動的に変換されます"}
      </p>
      {dataType === "wide" && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-1" />
          APIから同期
        </Button>
      )}
    </div>
  );
}

export function SmartReadResultView({ configId, taskId }: SmartReadResultViewProps) {
  const [activeTab, setActiveTab] = useState("wide");
  const hasAutoSynced = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  // データ読み込みフック
  const {
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
  } = useResultDataLoader({ configId, taskId });

  const syncMutation = useSyncTaskResults();

  // API同期して横持ち・縦持ちデータを取得（自動変換済み）
  const handleSyncFromApi = useCallback(async () => {
    console.info(`[ResultView] Triggering API sync for task ${taskId}...`);
    const result = await syncMutation.mutateAsync({ configId, taskId, forceSync: true });

    if (result.state === "PENDING") {
      retryCountRef.current += 1;
      if (retryCountRef.current <= 12) {
        retryTimerRef.current = setTimeout(() => {
          void handleSyncFromApi();
        }, 5000);
      }
      return;
    }

    retryCountRef.current = 0;

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
  }, [configId, setFilename, setLongData, setTransformErrors, setWideData, syncMutation, taskId]);

  useEffect(() => {
    hasAutoSynced.current = false;
    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [configId, taskId]);

  useEffect(() => {
    if (hasAutoSynced.current) return;
    if (isInitialLoading || loadError) return;
    if (wideData.length > 0 || longData.length > 0) return;

    hasAutoSynced.current = true;
    void handleSyncFromApi();
  }, [handleSyncFromApi, isInitialLoading, loadError, wideData.length, longData.length]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

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

  // 開発モード専用: DBから読み込み (force=false)
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const handleLoadFromDb = async () => {
    try {
      setIsLoadingFromDb(true);
      console.info(`[ResultView] Loading from DB (force=false)...`);
      const result = await syncTaskResults(configId, taskId, false);
      setWideData(result.wide_data as AnyRecord[]);
      setLongData(result.long_data as AnyRecord[]);
      setTransformErrors(result.errors);
      setFilename(result.filename);
      if (result.wide_data.length > 0) {
        setActiveTab("wide");
      }
    } catch (error) {
      console.error(`[ResultView] Load from DB failed:`, error);
    } finally {
      setIsLoadingFromDb(false);
    }
  };

  // 開発モード専用: 縦持ち変換
  const { transformToLong, isTransforming } = useTransformToLong({
    configId,
    taskId,
    wideData,
    filename,
    onSuccess: (long, errors) => {
      setLongData(long);
      setTransformErrors(errors);
      setActiveTab("long");
    },
  });

  // 開発モード専用: DB保存 (useTransformToLong内で自動実行されるが、明示的に呼ぶ場合用)
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const handleSaveToDb = async () => {
    try {
      setIsSavingToDb(true);
      await transformToLong(); // 変換とDB保存を実行
    } finally {
      setIsSavingToDb(false);
    }
  };

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
        onLoadFromDb={handleLoadFromDb}
        onTransformToLong={transformToLong}
        onSaveToDb={handleSaveToDb}
        isTransforming={isTransforming}
        isSaving={isSavingToDb || isLoadingFromDb}
      />
      <CardContent className="flex-1 overflow-hidden min-h-0 p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="px-4 border-b">
            <TabsList>
              <TabsTrigger value="wide">横持ち (Wide) - {wideData.length}件</TabsTrigger>
              <TabsTrigger value="long">縦持ち (Long) - {longData.length}件</TabsTrigger>
            </TabsList>
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
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
