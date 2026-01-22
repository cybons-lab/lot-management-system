/* eslint-disable max-lines-per-function, complexity */
/**
 * SmartReadPage
 * SmartRead OCR PDFインポートページ
 */

import { Settings, Loader2, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { diagnoseWatchDirFile } from "../api";
import { SmartReadManagedTaskList } from "../components/SmartReadManagedTaskList";
import { SmartReadResultView } from "../components/SmartReadResultView";
import { SmartReadSavedDataList } from "../components/SmartReadSavedDataList";
import { SmartReadSettingsModal } from "../components/SmartReadSettingsModal";
import { SmartReadUploadPanel } from "../components/SmartReadUploadPanel";
import {
  useSmartReadConfigs,
  useWatchDirFiles,
  useProcessFilesAuto,
  useSmartReadTasks,
} from "../hooks";
import { SMARTREAD_QUERY_KEYS } from "../hooks";
import { logger } from "../utils/logger";

import { Button } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Checkbox } from "@/components/ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui";
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
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function SmartReadPage() {
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedWatchFiles, setSelectedWatchFiles] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("import");
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const queryClient = useQueryClient();
  const { data: configs, isLoading: configsLoading } = useSmartReadConfigs();
  const {
    data: watchFiles,
    isLoading: isWatchFilesLoading,
    refetch: refetchWatchFiles,
  } = useWatchDirFiles(selectedConfigId);
  const processWatchFilesMutation = useProcessFilesAuto();
  const { refetch: refetchTasks } = useSmartReadTasks(selectedConfigId, false);

  const activeConfigs = useMemo(() => configs?.filter((c) => c.is_active) ?? [], [configs]);

  // Auto-select default config
  useEffect(() => {
    if (!configsLoading && activeConfigs.length > 0 && selectedConfigId === null) {
      const defaultConfig = activeConfigs.find((c) => c.is_default);
      if (defaultConfig) {
        setSelectedConfigId(defaultConfig.id);
      } else {
        logger.info("デフォルト設定がありません。設定を選択してください。");
      }
    }
  }, [configsLoading, activeConfigs, selectedConfigId]);

  const handleProcessWatchFiles = async () => {
    if (!selectedConfigId || selectedWatchFiles.length === 0) return;

    const result = await processWatchFilesMutation.mutateAsync({
      configId: selectedConfigId,
      filenames: selectedWatchFiles,
    });

    // Remove successfully processed files from selection
    setSelectedWatchFiles([]);
    if (result.task_id) {
      setSelectedTaskId(result.task_id);
    }

    // Refresh file list and task list, then switch to tasks
    refetchWatchFiles();
    refetchTasks(); // This refetches API tasks... wait, we want Managed Tasks now.
    // Actually `refetchTasks` was `useSmartReadTasks`.
    // We might need to refetch managed tasks.
    // But `SmartReadManagedTaskList` handles its own data fetching.
    // Tricky part: `handleProcessWatchFiles` calls API to process files. This creates tasks in DB (via backend).
    // So we just need to ensure `ManagedTaskList` refreshes.
    // We can invalidate the query here.

    // setActiveTab("tasks"); // we will rename "history" to "tasks"
    await queryClient.invalidateQueries({
      queryKey: selectedConfigId ? SMARTREAD_QUERY_KEYS.managedTasks(selectedConfigId) : [],
    });
    setActiveTab("detail");
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
        {/* ... Config Selection ... */}
        {/* (Keep verify existing code for Config Selection) */}
        <Card className="shrink-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label htmlFor="config-select" className="text-sm font-medium whitespace-nowrap">
                AI-OCR設定
              </label>
              <div className="flex-1">
                {configsLoading ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    設定を読み込み中...
                  </div>
                ) : activeConfigs.length === 0 ? (
                  <Alert variant="default" className="border-amber-200 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">設定がありません</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      AI-OCR設定を追加してください。右上の「設定」ボタンから追加できます。
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={selectedConfigId?.toString() ?? ""}
                    onValueChange={(value: string) => {
                      setSelectedConfigId(Number(value));
                      setSelectedWatchFiles([]); // Reset selection
                      setSelectedTaskId(null); // Reset task selection
                    }}
                  >
                    <SelectTrigger id="config-select">
                      <SelectValue placeholder="設定を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.id.toString()}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Layout */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-4 shrink-0">
            <TabsTrigger value="import">1. インポート</TabsTrigger>
            <TabsTrigger value="tasks">2. タスク</TabsTrigger>
            <TabsTrigger value="detail">3. 結果詳細</TabsTrigger>
            <TabsTrigger value="saved">4. 保存済みデータ</TabsTrigger>
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
                            selectedWatchFiles.length === 0 || processWatchFilesMutation.isPending
                          }
                          onClick={handleProcessWatchFiles}
                        >
                          {processWatchFilesMutation.isPending && (
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
            <div className="h-full overflow-hidden">
              <SmartReadManagedTaskList
                configId={selectedConfigId}
                selectedTaskId={selectedTaskId}
                onSelectTask={handleSelectTask}
                onViewDetail={() => setActiveTab("detail")}
              />
            </div>
          </TabsContent>

          {/* Tab 3: Detail (Result View) */}
          <TabsContent value="detail" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
            <div className="h-full">
              {!selectedConfigId ? (
                <Card className="h-full flex items-center justify-center text-gray-400">
                  <p>設定を選択してください</p>
                </Card>
              ) : selectedTaskId ? (
                <SmartReadResultView configId={selectedConfigId} taskId={selectedTaskId} />
              ) : (
                <Card className="h-full flex items-center justify-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-gray-300" />
                    <p>タスクタブからタスクを選択してください</p>
                  </div>
                </Card>
              )}
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
