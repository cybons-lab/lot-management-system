/* eslint-disable */
/* eslint-disable max-lines-per-function, complexity */
/**
 * SmartReadPage
 * SmartRead OCR PDFインポートページ
 */

import { Settings, Loader2, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { useState } from "react";

import {
  useSmartReadConfigs,
  useWatchDirFiles,
  useProcessWatchDirFiles,
  useSmartReadTasks,
} from "../hooks";
import { SmartReadSettingsModal } from "../components/SmartReadSettingsModal";
import { SmartReadResultView } from "../components/SmartReadResultView";
import { SmartReadTaskList } from "../components/SmartReadTaskList";
import { SmartReadUploadPanel } from "../components/SmartReadUploadPanel";

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

  const { data: configs, isLoading: configsLoading } = useSmartReadConfigs();
  const {
    data: watchFiles,
    isLoading: isWatchFilesLoading,
    refetch: refetchWatchFiles,
  } = useWatchDirFiles(selectedConfigId);
  const processWatchFilesMutation = useProcessWatchDirFiles();
  const { refetch: refetchTasks } = useSmartReadTasks(selectedConfigId);

  console.log("[SmartReadPage] Render", { selectedConfigId, activeTab, configs });

  const activeConfigs = configs?.filter((c) => c.is_active) ?? [];

  const handleProcessWatchFiles = async () => {
    if (!selectedConfigId || selectedWatchFiles.length === 0) return;

    const results = await processWatchFilesMutation.mutateAsync({
      configId: selectedConfigId,
      filenames: selectedWatchFiles,
    });

    // Remove successfully processed files from selection
    const successFilenames = results.filter((r) => r.success).map((r) => r.filename);
    setSelectedWatchFiles((prev) => prev.filter((f) => !successFilenames.includes(f)));

    // Refresh file list and task list, then switch to history
    refetchWatchFiles();
    refetchTasks();
    setActiveTab("history");
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
    refetchTasks();
    setActiveTab("history");
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setActiveTab("detail");
  };

  return (
    <PageContainer>
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
        {/* Config Selection - Always visible */}
        <Card className="shrink-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium whitespace-nowrap">AI-OCR設定</label>
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
                    <SelectTrigger>
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
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="import">1. インポート</TabsTrigger>
            <TabsTrigger value="history">2. 履歴</TabsTrigger>
            <TabsTrigger value="detail">3. 結果詳細</TabsTrigger>
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
                      <div className="p-4 border-t">
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

          {/* Tab 2: History (Task List) */}
          <TabsContent value="history" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">処理履歴</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => refetchTasks()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <SmartReadTaskList
                  configId={selectedConfigId}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={handleSelectTask}
                />
              </CardContent>
            </Card>
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
                    <p>履歴タブからタスクを選択してください</p>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SmartReadSettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </PageContainer>
  );
}
