import { useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { diagnoseWatchDirFile } from "../api";
import { SmartReadConfigSelector } from "../components/SmartReadConfigSelector";
import { SmartReadImportTab } from "../components/SmartReadImportTab";
import { SmartReadSavedTab } from "../components/SmartReadSavedTab";
import { SmartReadSettingsModal } from "../components/SmartReadSettingsModal";
import { SmartReadTasksTab } from "../components/SmartReadTasksTab";
import {
  useSmartReadConfigs,
  useWatchDirFiles,
  useSmartReadTasks,
  useStartPadRun,
  usePadRuns,
} from "../hooks";
import { SMARTREAD_QUERY_KEYS } from "../hooks";
import type { SmartReadPadRunListItem as PadRun } from "../types";
import { logger } from "../utils/logger";
import { PAD_RUN_STEP_ORDER } from "../utils/pad-run-steps";

import { Button } from "@/components/ui";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/AuthContext";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

/* eslint-disable-next-line max-lines-per-function */
export function SmartReadPage() {
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedWatchFiles, setSelectedWatchFiles] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [testRuns, setTestRuns] = useState<PadRun[] | null>(null);
  const { tab = "import" } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;

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
  const testIntervalRef = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      if (testIntervalRef.current) {
        window.clearInterval(testIntervalRef.current);
      }
    };
  }, []);

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

  const startWatchFolderTest = () => {
    if (testIntervalRef.current) {
      window.clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }

    const createdAt = new Date().toISOString();
    const runId = `test-${Date.now()}`;
    let stepIndex = 0;

    setTestRuns([
      {
        run_id: runId,
        status: "RUNNING",
        step: PAD_RUN_STEP_ORDER[0].key,
        filenames: ["sample-invoice.pdf"],
        wide_data_count: 0,
        long_data_count: 0,
        created_at: createdAt,
        completed_at: null,
      },
    ]);

    navigate(`../tasks`);

    testIntervalRef.current = window.setInterval(() => {
      stepIndex += 1;
      const nextIndex = Math.min(stepIndex, PAD_RUN_STEP_ORDER.length - 1);
      const isDone = nextIndex === PAD_RUN_STEP_ORDER.length - 1;
      const now = new Date().toISOString();

      setTestRuns((current) => {
        if (!current) return current;
        return current.map((run) => ({
          ...run,
          status: isDone ? "SUCCEEDED" : "RUNNING",
          step: PAD_RUN_STEP_ORDER[nextIndex].key,
          wide_data_count: isDone ? 12 : run.wide_data_count,
          long_data_count: isDone ? 36 : run.long_data_count,
          completed_at: isDone ? now : null,
        }));
      });

      if (isDone && testIntervalRef.current) {
        window.clearInterval(testIntervalRef.current);
        testIntervalRef.current = null;
      }
    }, 1200);
  };

  const runsForDisplay = testRuns ?? padRuns?.runs;

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
            canRunTest={isAdmin}
            onToggleAll={onToggleAll}
            toggleWatchFile={toggleWatchFile}
            onProcessFiles={onProcessFiles}
            onDiagnose={handleDiagnoseWatchFile}
            onStartTest={isAdmin ? startWatchFolderTest : undefined}
            onRefetch={refetchWatchFiles}
            onAnalyzeSuccess={handleAnalyzeSuccess}
          />

          <SmartReadTasksTab
            runs={runsForDisplay}
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

// --- Helper Functions ---

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
