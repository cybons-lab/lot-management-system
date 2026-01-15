/* eslint-disable */
/* eslint-disable max-lines-per-function, complexity */
/**
 * SmartReadPage
 * SmartRead OCR PDFインポートページ
 */

import { Upload, Download, FileText, Settings, Loader2, AlertCircle, RotateCw } from "lucide-react";
import { useState, useRef } from "react";

import { downloadJson, downloadCsv, type SmartReadAnalyzeResponse } from "../api";
import { SmartReadSettingsModal } from "../components/SmartReadSettingsModal";
import {
  useSmartReadConfigs,
  useAnalyzeFile,
  useWatchDirFiles,
  useProcessWatchDirFiles,
} from "../hooks";

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function SmartReadPage() {
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<SmartReadAnalyzeResponse | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedWatchFiles, setSelectedWatchFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: configs, isLoading: configsLoading } = useSmartReadConfigs();
  const analyzeMutation = useAnalyzeFile();
  const {
    data: watchFiles,
    isLoading: isWatchFilesLoading,
    refetch: refetchWatchFiles,
  } = useWatchDirFiles(selectedConfigId);
  const processWatchFilesMutation = useProcessWatchDirFiles();

  const activeConfigs = configs?.filter((c) => c.is_active) ?? [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalyzeResult(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalyzeResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleAnalyze = async () => {
    if (!selectedConfigId || !selectedFile) return;

    const result = await analyzeMutation.mutateAsync({
      configId: selectedConfigId,
      file: selectedFile,
    });
    setAnalyzeResult(result);
  };

  const handleDownloadJson = () => {
    if (!analyzeResult?.data) return;
    const filename = analyzeResult.filename.replace(/\.[^/.]+$/, "") || "export";
    downloadJson(analyzeResult.data, `${filename}.json`);
  };

  const handleDownloadCsv = () => {
    if (!analyzeResult?.data) return;
    const filename = analyzeResult.filename.replace(/\.[^/.]+$/, "") || "export";
    downloadCsv(analyzeResult.data, `${filename}.csv`);
  };

  const handleProcessWatchFiles = async () => {
    if (!selectedConfigId || selectedWatchFiles.length === 0) return;

    const results = await processWatchFilesMutation.mutateAsync({
      configId: selectedConfigId,
      filenames: selectedWatchFiles,
    });

    // Remove successfully processed files from selection
    const successFilenames = results.filter((r) => r.success).map((r) => r.filename);
    setSelectedWatchFiles((prev) => prev.filter((f) => !successFilenames.includes(f)));

    // Refresh file list
    refetchWatchFiles();

    // Show result of the last processed file if any
    if (results.length > 0) {
      const lastResult = results[results.length - 1];
      if (lastResult.success) {
        setAnalyzeResult(lastResult);
        setSelectedFile(null); // Clear manual file selection to avoid confusion
      }
    }
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

      <div className="space-y-4">
        {/* Config Selection - Shared across tabs */}
        <Card>
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
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>設定がありません</AlertTitle>
                    <AlertDescription>
                      AI-OCR設定を追加してください。右上の「設定」ボタンから追加できます。
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={selectedConfigId?.toString() ?? ""}
                    onValueChange={(value: string) => {
                      setSelectedConfigId(Number(value));
                      setSelectedWatchFiles([]); // Reset selection on config change
                      setAnalyzeResult(null);
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

        <Tabs defaultValue="upload" className="w-full" onValueChange={() => setAnalyzeResult(null)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">ファイル読み込み</TabsTrigger>
            <TabsTrigger value="watch">監視フォルダ</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            {/* Original Upload UI */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>ファイルアップロード</CardTitle>
                  <CardDescription>解析するPDFまたは画像ファイルを選択してください</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Drop Zone */}
                  <div
                    className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/50"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      クリックまたはドラッグ&ドロップでファイルを選択
                    </p>
                    <p className="mt-1 text-xs text-gray-400">PDF, PNG, JPG, JPEG形式に対応</p>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
                      <FileText className="h-8 w-8 text-indigo-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setAnalyzeResult(null);
                        }}
                      >
                        削除
                      </Button>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={!selectedConfigId || !selectedFile || analyzeMutation.isPending}
                    onClick={handleAnalyze}
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        解析中...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        解析開始
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Analysis Result (Right Column) */}
              <Card>
                <CardHeader>
                  <CardTitle>解析結果</CardTitle>
                  <CardDescription>AI-OCR APIから取得した解析結果を表示します</CardDescription>
                </CardHeader>
                <CardContent>
                  {!analyzeResult ? (
                    <div className="flex h-64 flex-col items-center justify-center text-gray-400">
                      <FileText className="h-16 w-16" />
                      <p className="mt-4 text-sm">ファイルを選択して解析を開始してください</p>
                    </div>
                  ) : !analyzeResult.success ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>解析エラー</AlertTitle>
                      <AlertDescription>
                        {analyzeResult.error_message || "不明なエラーが発生しました"}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleDownloadJson}>
                          <Download className="mr-2 h-4 w-4" />
                          JSONダウンロード
                        </Button>
                        <Button variant="outline" onClick={handleDownloadCsv}>
                          <Download className="mr-2 h-4 w-4" />
                          CSVダウンロード
                        </Button>
                      </div>
                      <div className="rounded-lg border bg-gray-50 p-4">
                        <h4 className="mb-2 text-sm font-medium">結果プレビュー</h4>
                        <pre className="max-h-96 overflow-auto rounded bg-white p-3 text-xs">
                          {JSON.stringify(analyzeResult.data, null, 2)}
                        </pre>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="rounded-lg border p-3">
                          <p className="text-gray-500">ファイル名</p>
                          <p className="font-medium">{analyzeResult.filename}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-gray-500">抽出項目数</p>
                          <p className="font-medium">{analyzeResult.data.length} 件</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="watch" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left: File List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>監視フォルダ内ファイル</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => refetchWatchFiles()}
                      disabled={!selectedConfigId || isWatchFilesLoading}
                    >
                      <RotateCw
                        className={`h-4 w-4 ${isWatchFilesLoading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                  <CardDescription>
                    設定された監視フォルダ（入力フォルダ）内のファイル一覧
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedConfigId ? (
                    <div className="py-8 text-center text-gray-500">設定を選択してください</div>
                  ) : isWatchFilesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : !watchFiles || watchFiles.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">ファイルが見つかりません</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">{watchFiles.length} ファイル</div>
                        <Button
                          size="sm"
                          onClick={handleProcessWatchFiles}
                          disabled={
                            selectedWatchFiles.length === 0 || processWatchFilesMutation.isPending
                          }
                        >
                          {processWatchFilesMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="mr-2 h-4 w-4" />
                          )}
                          選択したファイルを処理 ({selectedWatchFiles.length})
                        </Button>
                      </div>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={
                                    watchFiles.length > 0 &&
                                    selectedWatchFiles.length === watchFiles.length
                                  }
                                  onCheckedChange={toggleAllWatchFiles}
                                />
                              </TableHead>
                              <TableHead>ファイル名</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {watchFiles.map((filename) => (
                              <TableRow key={filename}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedWatchFiles.includes(filename)}
                                    onCheckedChange={() => toggleWatchFile(filename)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{filename}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right: Results (Reused logic or simplified list) */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>処理結果</CardTitle>
                  <CardDescription>最新の処理結果を表示します</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Reuse the result display logic from pure upload tab, mostly */}
                  {!analyzeResult ? (
                    <div className="flex h-64 flex-col items-center justify-center text-gray-400">
                      <FileText className="h-16 w-16" />
                      <p className="mt-4 text-sm">ファイルを選択して処理を実行してください</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Alert variant={analyzeResult.success ? "default" : "destructive"}>
                        {analyzeResult.success ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertTitle>{analyzeResult.success ? "処理完了" : "処理エラー"}</AlertTitle>
                        <AlertDescription>
                          {analyzeResult.filename}{" "}
                          {analyzeResult.success
                            ? "の処理が完了しました"
                            : `の処理に失敗しました: ${analyzeResult.error_message}`}
                        </AlertDescription>
                      </Alert>

                      {analyzeResult.success && (
                        <>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={handleDownloadJson}>
                              <Download className="mr-2 h-4 w-4" />
                              JSON
                            </Button>
                            <Button variant="outline" onClick={handleDownloadCsv}>
                              <Download className="mr-2 h-4 w-4" />
                              CSV
                            </Button>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-4">
                            <h4 className="mb-2 text-sm font-medium">結果プレビュー</h4>
                            <pre className="max-h-96 overflow-auto rounded bg-white p-3 text-xs">
                              {JSON.stringify(analyzeResult.data, null, 2)}
                            </pre>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SmartReadSettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </PageContainer>
  );
}
