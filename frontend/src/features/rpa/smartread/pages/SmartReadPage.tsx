/* eslint-disable max-lines-per-function */
/**
 * SmartReadPage
 * SmartRead OCR PDFインポートページ
 */

import { useQueryClient } from "@tanstack/react-query";
import { Settings, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { diagnoseWatchDirFile } from "../api";
import { SmartReadConfigSelector } from "../components/SmartReadConfigSelector";
import { SmartReadManagedTaskList } from "../components/SmartReadManagedTaskList";
import { SmartReadPadRunStatusList } from "../components/SmartReadPadRunStatusList";
import { SmartReadSavedDataList } from "../components/SmartReadSavedDataList";
import { SmartReadSettingsModal } from "../components/SmartReadSettingsModal";
import { SmartReadUploadPanel } from "../components/SmartReadUploadPanel";
import {
  useSmartReadConfigs,
  useWatchDirFiles,
  useSmartReadTasks,
  useStartPadRun,
  usePadRuns,
} from "../hooks";
import { SMARTREAD_QUERY_KEYS } from "../hooks";
import { logger } from "../utils/logger";

import { Button } from "@/components/ui";
import { Checkbox } from "@/components/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTES } from "@/constants/routes";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function SmartReadPage() {
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedWatchFiles, setSelectedWatchFiles] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("import");
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: configs, isLoading: configsLoading } = useSmartReadConfigs();
  const {
    data: watchFiles,
    isLoading: isWatchFilesLoading,
    refetch: refetchWatchFiles,
  } = useWatchDirFiles(selectedConfigId);
  // PAD互換フロー: /pad-runs API を使用
  const startPadRunMutation = useStartPadRun();
  const { data: padRuns, refetch: refetchPadRuns } = usePadRuns(selectedConfigId);
  useSmartReadTasks(selectedConfigId, false);

  // Auto-select default config
  useEffect(() => {
    if (!configsLoading && configs && selectedConfigId === null) {
      const activeConfigs = configs.filter((c) => c.is_active);
      const defaultConfig = activeConfigs.find((c) => c.is_default);
      if (defaultConfig) {
        setSelectedConfigId(defaultConfig.id);
      } else if (activeConfigs.length > 0) {
        logger.info("デフォルト設定がありません。設定を選択してください。");
      }
    }
  }, [configsLoading, configs, selectedConfigId]);

  // Auto-navigate to OCR Results when a run succeeds
  const prevRunsRef = useRef<string[]>([]);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (padRuns?.runs) {
      if (isInitialLoadRef.current) {
        // 初回ロード時は既存の成功済みタスクを「既知」として記録するだけ
        prevRunsRef.current = padRuns.runs
          .filter((run) => run.status === "SUCCEEDED")
          .map((run) => run.run_id);
        isInitialLoadRef.current = false;
        return;
      }

      const succeededRun = padRuns.runs.find(
        (run) => run.status === "SUCCEEDED" && !prevRunsRef.current.includes(run.run_id),
      );
      if (succeededRun) {
        logger.info("新しく処理が完了しました。結果一覧へ移動します。", {
          run_id: succeededRun.run_id,
        });
        navigate(ROUTES.OCR_RESULTS.LIST);
      }

      // 成功済みリストを更新
      prevRunsRef.current = padRuns.runs
        .filter((run) => run.status === "SUCCEEDED")
        .map((run) => run.run_id);
    }
  }, [padRuns, navigate]);

  const handleProcessWatchFiles = async () => {
    if (!selectedConfigId || selectedWatchFiles.length === 0) return;

    // PAD互換フロー: /pad-runs API を使用
    await startPadRunMutation.mutateAsync({
      configId: selectedConfigId,
      filenames: selectedWatchFiles,
    });

    // Remove successfully processed files from selection
    setSelectedWatchFiles([]);
    setSelectedTaskId(null);

    // Refresh file list and PAD runs list
    refetchWatchFiles();
    refetchPadRuns();

    // タスクタブに切り替え（PAD Runの状態表示はタスクタブで行う）
    await queryClient.invalidateQueries({
      queryKey: selectedConfigId ? SMARTREAD_QUERY_KEYS.managedTasks(selectedConfigId) : [],
    });
    setActiveTab("tasks");
  };

  const toggleWatchFile = (filename: string) => {
    setSelectedWatchFiles((prev) =>
      prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename],
    );
  };

  const toggleAllWatchFiles = () => {
    if (!watchFiles) return;
    if (selectedWatchFiles.length === watchFiles.length) {
      setSelectedWatchFiles([]);
    } else {
      setSelectedWatchFiles([...watchFiles]);
    }
  };

  const handleAnalyzeSuccess = () => {
    // refetchTasks(); // same here
    setActiveTab("tasks");
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleDiagnoseWatchFile = async () => {
    if (!selectedConfigId || selectedWatchFiles.length === 0 || isDiagnosing) return;
    const targetFile = selectedWatchFiles[0];
    setIsDiagnosing(true);
    logger.info("API診断開始", { configId: selectedConfigId, filename: targetFile });
    try {
      const response = await diagnoseWatchDirFile(selectedConfigId, targetFile);
      logger.info("API診断完了", {
        requestFlowSuccess: response.request_flow.success,
        exportFlowSuccess: response.export_flow.success,
      });
      logger.debug("API診断詳細", response as unknown as Record<string, unknown>);
    } catch (error) {
      logger.error("API診断失敗", error);
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <PageContainer>
      {/* ... PageHeader ... */}
      <PageHeader
        title="AI-OCR PDFインポート"
        subtitle="AI-OCRを使用してPDFや画像を解析し、データを抽出します"
        actions={
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            設定
          </Button>
        }
      />

      <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
        <SmartReadConfigSelector
          configs={configs}
          isLoading={configsLoading}
          selectedConfigId={selectedConfigId}
          onSelect={(id) => {
            setSelectedConfigId(id);
            setSelectedWatchFiles([]);
            setSelectedTaskId(null);
          }}
        />

        {/* Tabs Layout */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="import">1. インポート</TabsTrigger>
            <TabsTrigger value="tasks">2. タスク</TabsTrigger>
            <TabsTrigger value="saved">3. 保存済みデータ</TabsTrigger>
          </TabsList>

          {/* Tab 1: Import (Watch Folder & Upload) */}
          <TabsContent value="import" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Watch Folder */}
              <Card className="flex flex-col h-full">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">監視フォルダ</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => refetchWatchFiles()}
                      disabled={!selectedConfigId}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-0">
                  {!selectedConfigId ? (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
                      設定を選択してください
                    </div>
                  ) : isWatchFilesLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : !watchFiles || watchFiles.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
                      ファイルはありません
                    </div>
                  ) : (
                    <>
                      <div className="border-b px-4 py-2 bg-gray-50/50">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="select-all"
                            checked={
                              watchFiles.length > 0 &&
                              selectedWatchFiles.length === watchFiles.length
                            }
                            onCheckedChange={toggleAllWatchFiles}
                          />
                          <label
                            htmlFor="select-all"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            すべて選択
                          </label>
                        </div>
                      </div>
                      <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                          {watchFiles.map((file) => (
                            <div
                              key={file}
                              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => toggleWatchFile(file)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleWatchFile(file);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <Checkbox
                                checked={selectedWatchFiles.includes(file)}
                                onCheckedChange={() => toggleWatchFile(file)}
                              />
                              <span className="text-sm truncate" title={file}>
                                {file}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="p-4 border-t space-y-2">
                        <Button
                          className="w-full"
                          size="sm"
                          disabled={
                            selectedWatchFiles.length === 0 || startPadRunMutation.isPending
                          }
                          onClick={handleProcessWatchFiles}
                        >
                          {startPadRunMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          選択ファイルを処理
                        </Button>
                        <Button
                          className="w-full"
                          size="sm"
                          variant="outline"
                          disabled={selectedWatchFiles.length === 0 || isDiagnosing}
                          onClick={handleDiagnoseWatchFile}
                        >
                          {isDiagnosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          API診断（選択ファイル先頭）
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Upload Panel */}
              <div className="h-full">
                {!selectedConfigId ? (
                  <Card className="h-full flex items-center justify-center text-gray-400">
                    <p>設定を選択してください</p>
                  </Card>
                ) : (
                  <SmartReadUploadPanel
                    configId={selectedConfigId}
                    onAnalyzeSuccess={handleAnalyzeSuccess}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Tasks (Merged) */}
          <TabsContent value="tasks" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
            <div className="h-full overflow-hidden flex flex-col gap-4">
              {/* PAD Run Status (最新の実行状態) */}
              <SmartReadPadRunStatusList runs={padRuns?.runs} />
              {/* Managed Task List */}
              <div className="flex-1 overflow-hidden">
                <SmartReadManagedTaskList
                  configId={selectedConfigId}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={handleSelectTask}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Saved Data */}
          <TabsContent value="saved" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
            <div className="h-full overflow-hidden">
              <SmartReadSavedDataList configId={selectedConfigId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SmartReadSettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </PageContainer>
  );
}
