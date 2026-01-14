/* eslint-disable max-lines-per-function, complexity */
/**
 * SmartReadPage
 * SmartRead OCR PDFインポートページ
 */

import { Upload, Download, FileText, Settings, Loader2, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";

import { downloadJson, downloadCsv, type SmartReadAnalyzeResponse } from "../api";
import { SmartReadSettingsModal } from "../components/SmartReadSettingsModal";
import { useSmartReadConfigs, useAnalyzeFile } from "../hooks";

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function SmartReadPage() {
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<SmartReadAnalyzeResponse | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: configs, isLoading: configsLoading } = useSmartReadConfigs();
  const analyzeMutation = useAnalyzeFile();

  const activeConfigs = configs?.filter((c) => c.is_active) ?? [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalyzeResult(null);
    }
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
    const filename = selectedFile?.name.replace(/\.[^/.]+$/, "") || "export";
    downloadJson(analyzeResult.data, `${filename}.json`);
  };

  const handleDownloadCsv = () => {
    if (!analyzeResult?.data) return;
    const filename = selectedFile?.name.replace(/\.[^/.]+$/, "") || "export";
    downloadCsv(analyzeResult.data, `${filename}.csv`);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
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

  return (
    <PageContainer>
      <PageHeader
        title="SmartRead PDFインポート"
        subtitle="SmartRead OCRを使用してPDFや画像を解析し、データを抽出します"
        actions={
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            設定
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左カラム: ファイルアップロード */}
        <Card>
          <CardHeader>
            <CardTitle>ファイルアップロード</CardTitle>
            <CardDescription>解析するPDFまたは画像ファイルを選択してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 設定選択 */}
            <div className="space-y-2">
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-sm font-medium">SmartRead設定</label>
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
                    SmartRead設定を追加してください。右上の「設定」ボタンから追加できます。
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  value={selectedConfigId?.toString() ?? ""}
                  onValueChange={(value: string) => setSelectedConfigId(Number(value))}
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

            {/* ファイルドロップエリア */}
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

            {/* 選択されたファイル */}
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

            {/* 解析ボタン */}
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

        {/* 右カラム: 解析結果 */}
        <Card>
          <CardHeader>
            <CardTitle>解析結果</CardTitle>
            <CardDescription>SmartRead APIから取得した解析結果を表示します</CardDescription>
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
                {/* ダウンロードボタン */}
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

                {/* 結果プレビュー */}
                <div className="rounded-lg border bg-gray-50 p-4">
                  <h4 className="mb-2 text-sm font-medium">結果プレビュー</h4>
                  <pre className="max-h-96 overflow-auto rounded bg-white p-3 text-xs">
                    {JSON.stringify(analyzeResult.data, null, 2)}
                  </pre>
                </div>

                {/* 統計情報 */}
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

      {/* 設定モーダル */}
      <SmartReadSettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </PageContainer>
  );
}
