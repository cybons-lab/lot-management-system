/* eslint-disable max-lines */
/**
 * SmartReadPage
 * SmartRead OCR PDFインポートページ
 */

import { useQueryClient } from "@tanstack/react-query";
import { Settings, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

import { Button, Checkbox } from "@/components/ui";
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

/* eslint-disable-next-line max-lines-per-function */
export function SmartReadPage() {
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedWatchFiles, setSelectedWatchFiles] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { tab = "import" } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [isDiagnosing, setIsDiagnosing] = useState(false);

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
  const pageMountedAt = useRef(new Date());

  useEffect(() => {
    if (!padRuns?.runs) return;

    if (isInitialLoadRef.current) {
      prevRunsRef.current = padRuns.runs
        .filter((r) => r.status === "SUCCEEDED")
        .map((r) => r.run_id);
      isInitialLoadRef.current = false;
      return;
    }

    const succeededRun = findNewSucceededRun(
      padRuns.runs,
      prevRunsRef.current,
      pageMountedAt.current,
    );

    if (succeededRun) {
      logger.info("新しく処理が完了しました。結果一覧へ移動します。", {
        run_id: succeededRun.run_id,
      });
      navigate(ROUTES.OCR_RESULTS.LIST);
    }

    prevRunsRef.current = padRuns.runs.filter((r) => r.status === "SUCCEEDED").map((r) => r.run_id);
  }, [padRuns, navigate]);

  const onProcessFiles = async () => {
    if (!selectedConfigId || selectedWatchFiles.length === 0) return;
    await startPadRunMutation.mutateAsync({
      configId: selectedConfigId,
      filenames: selectedWatchFiles,
    });
    setSelectedWatchFiles([]);
    setSelectedTaskId(null);
    refetchWatchFiles();
    refetchPadRuns();
    await queryClient.invalidateQueries({
      queryKey: selectedConfigId ? SMARTREAD_QUERY_KEYS.managedTasks(selectedConfigId) : [],
    });
    navigate(`../tasks`);
  };

  const toggleWatchFile = (filename: string) => {
    setSelectedWatchFiles((prev) =>
      prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename],
    );
  };

  const onToggleAll = () => {
    if (!watchFiles) return;
    setSelectedWatchFiles(selectedWatchFiles.length === watchFiles.length ? [] : [...watchFiles]);
  };

  const handleAnalyzeSuccess = () => {
    // タスクリストとPAD Runリストを更新
    if (selectedConfigId) {
      queryClient.invalidateQueries({
        queryKey: SMARTREAD_QUERY_KEYS.managedTasks(selectedConfigId),
      });
      refetchPadRuns();
    }
    navigate(`../tasks`);
  };

  const handleDiagnoseWatchFile = async () => {
    if (!selectedConfigId || selectedWatchFiles.length === 0 || isDiagnosing) return;
    setIsDiagnosing(true);
    try {
      await runDiagnostic(selectedConfigId, selectedWatchFiles[0]);
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
          value={tab}
          onValueChange={(value) => navigate(`../${value}`)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="import">1. インポート</TabsTrigger>
            <TabsTrigger value="tasks">2. タスク</TabsTrigger>
            <TabsTrigger value="saved">3. 保存済みデータ</TabsTrigger>
          </TabsList>

          <SmartReadImportTab
            selectedConfigId={selectedConfigId}
            isWatchFilesLoading={isWatchFilesLoading}
            watchFiles={watchFiles}
            selectedWatchFiles={selectedWatchFiles}
            isPending={startPadRunMutation.isPending}
            isDiagnosing={isDiagnosing}
            onToggleAll={onToggleAll}
            toggleWatchFile={toggleWatchFile}
            onProcessFiles={onProcessFiles}
            onDiagnose={handleDiagnoseWatchFile}
            onRefetch={refetchWatchFiles}
            onAnalyzeSuccess={handleAnalyzeSuccess}
          />

          <SmartReadTasksTab
            runs={padRuns?.runs}
            configId={selectedConfigId}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
          />

          <SmartReadSavedTab configId={selectedConfigId} />
        </Tabs>
      </div>

      <SmartReadSettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </PageContainer>
  );
}

interface ImportTabProps {
  selectedConfigId: number | null;
  isWatchFilesLoading: boolean;
  watchFiles: string[] | undefined;
  selectedWatchFiles: string[];
  isPending: boolean;
  isDiagnosing: boolean;
  onToggleAll: () => void;
  toggleWatchFile: (f: string) => void;
  onProcessFiles: () => void;
  onDiagnose: () => void;
  onRefetch: () => void;
  onAnalyzeSuccess: () => void;
}

interface TasksTabProps {
  runs: PadRun[] | undefined;
  configId: number | null;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}

/* eslint-disable-next-line max-lines-per-function */
function SmartReadImportTab({
  selectedConfigId,
  isWatchFilesLoading,
  watchFiles,
  selectedWatchFiles,
  isPending,
  isDiagnosing,
  onToggleAll,
  toggleWatchFile,
  onProcessFiles,
  onDiagnose,
  onRefetch,
  onAnalyzeSuccess,
}: ImportTabProps) {
  return (
    <TabsContent value="import" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
      <div className="grid grid-cols-2 gap-4 h-full">
        <Card className="flex flex-col h-full">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">監視フォルダ</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRefetch}
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
                        watchFiles.length > 0 && selectedWatchFiles.length === watchFiles.length
                      }
                      onCheckedChange={onToggleAll}
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
                    {watchFiles.map((file: string) => (
                      <WatchFileItem
                        key={file}
                        file={file}
                        isSelected={selectedWatchFiles.includes(file)}
                        onToggle={() => toggleWatchFile(file)}
                      />
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t space-y-2">
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={selectedWatchFiles.length === 0 || isPending}
                    onClick={onProcessFiles}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    選択ファイルを処理
                  </Button>
                  <Button
                    className="w-full"
                    size="sm"
                    variant="outline"
                    disabled={selectedWatchFiles.length === 0 || isDiagnosing}
                    onClick={onDiagnose}
                  >
                    {isDiagnosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    API診断（選択ファイル先頭）
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="h-full">
          {!selectedConfigId ? (
            <Card className="h-full flex items-center justify-center text-gray-400">
              <p>設定を選択してください</p>
            </Card>
          ) : (
            <SmartReadUploadPanel configId={selectedConfigId} onAnalyzeSuccess={onAnalyzeSuccess} />
          )}
        </div>
      </div>
    </TabsContent>
  );
}

function WatchFileItem({
  file,
  isSelected,
  onToggle,
}: {
  file: string;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle())}
    >
      <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      <span className="text-sm truncate" title={file}>
        {file}
      </span>
    </div>
  );
}

function SmartReadTasksTab({ runs, configId, selectedTaskId, onSelectTask }: TasksTabProps) {
  return (
    <TabsContent value="tasks" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
      <div className="h-full overflow-hidden flex flex-col gap-4">
        <SmartReadPadRunStatusList runs={runs} />
        <div className="flex-1 overflow-hidden">
          <SmartReadManagedTaskList
            configId={configId}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
          />
        </div>
      </div>
    </TabsContent>
  );
}

function SmartReadSavedTab({ configId }: { configId: number | null }) {
  return (
    <TabsContent value="saved" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
      <div className="h-full overflow-hidden">
        <SmartReadSavedDataList configId={configId} />
      </div>
    </TabsContent>
  );
}

// --- Helper Functions ---

interface PadRun {
  run_id: string;
  status: string;
  step: string;
  filenames: string[] | null;
  wide_data_count: number;
  long_data_count: number;
  created_at: string;
}

function findNewSucceededRun(runs: PadRun[], knownRunIds: string[], mountedAt: Date) {
  return runs.find((run) => {
    const isSucceeded = run.status === "SUCCEEDED";
    const isAlreadyProcessed = knownRunIds.includes(run.run_id);
    const isNew = new Date(run.created_at) >= mountedAt;
    return isSucceeded && !isAlreadyProcessed && isNew;
  });
}

async function runDiagnostic(configId: number, filename: string) {
  logger.info("API診断開始", { configId, filename });
  try {
    const response = await diagnoseWatchDirFile(configId, filename);
    logger.info("API診断完了", {
      requestFlowSuccess: response.request_flow.success,
      exportFlowSuccess: response.export_flow.success,
    });
    logger.debug("API診断詳細", response as unknown as Record<string, unknown>);
    return response;
  } catch (error) {
    logger.error("API診断失敗", error);
    throw error;
  }
}
