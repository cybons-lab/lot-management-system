import { FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useAnalyzeFile } from "../hooks";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

interface SmartReadUploadPanelProps {
  configId: number;
  onAnalyzeSuccess: () => void;
}

function UploadDropzone({
  fileInputRef,
  onDragOver,
  onDrop,
  onFileSelect,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/50"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      tabIndex={0}
      role="button"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          fileInputRef.current?.click();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        multiple
        onChange={onFileSelect}
        className="hidden"
      />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">クリックまたはドラッグ&ドロップでファイルを選択</p>
      <p className="mt-1 text-xs text-gray-400">PDF, PNG, JPG, JPEG形式に対応</p>
    </div>
  );
}

function SelectedFilesList({
  selectedFiles,
  onRemove,
}: {
  selectedFiles: File[];
  onRemove: (index: number) => void;
}) {
  if (selectedFiles.length === 0) return null;

  return (
    <div className="space-y-2">
      {selectedFiles.map((file, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
          <FileText className="h-8 w-8 text-indigo-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
            削除
          </Button>
        </div>
      ))}
    </div>
  );
}

function AnalyzeActionSection({
  canAnalyze,
  isPending,
  onAnalyze,
  configId,
  hasFiles,
}: {
  canAnalyze: boolean;
  isPending: boolean;
  onAnalyze: () => void;
  configId: number;
  hasFiles: boolean;
}) {
  return (
    <div className="space-y-2">
      <Button className="w-full" disabled={!canAnalyze || isPending} onClick={onAnalyze}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            解析中...
          </>
        ) : (
          "解析開始"
        )}
      </Button>
      {!configId && <p className="text-xs text-amber-600">⚠️ AI-OCR設定を選択してください</p>}
      {configId && !hasFiles && (
        <p className="text-xs text-gray-500">📁 ファイルをアップロードしてください</p>
      )}
    </div>
  );
}

function useSmartReadUploadState({ configId, onAnalyzeSuccess }: SmartReadUploadPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeMutation = useAnalyzeFile();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleAnalyze = async () => {
    if (!configId) {
      toast.error("AI-OCR設定を選択してください");
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error("ファイルを選択してください");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const file of selectedFiles) {
      try {
        const result = await analyzeMutation.mutateAsync({ configId, file });
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          toast.error(`"${file.name}" の解析に失敗: ${result.error_message}`);
        }
      } catch (error) {
        failCount++;
        console.error(`Failed to analyze file: ${file.name}`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount}件のファイルを解析開始しました`);
      setSelectedFiles([]);
      onAnalyzeSuccess();
    } else if (failCount > 0) {
      toast.error(`${failCount}件のファイルの解析に失敗しました`);
    }
  };

  return {
    selectedFiles,
    setSelectedFiles,
    fileInputRef,
    analyzeMutation,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleAnalyze,
    canAnalyze: Boolean(configId && selectedFiles.length > 0),
    hasFiles: selectedFiles.length > 0,
  };
}

export function SmartReadUploadPanel({ configId, onAnalyzeSuccess }: SmartReadUploadPanelProps) {
  const state = useSmartReadUploadState({ configId, onAnalyzeSuccess });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>ファイルアップロード</CardTitle>
        <CardDescription>解析するPDFまたは画像ファイルを選択してください</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UploadDropzone
          fileInputRef={state.fileInputRef}
          onDragOver={state.handleDragOver}
          onDrop={state.handleDrop}
          onFileSelect={state.handleFileSelect}
        />

        <SelectedFilesList
          selectedFiles={state.selectedFiles}
          onRemove={(index) => state.setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
        />

        <AnalyzeActionSection
          canAnalyze={state.canAnalyze}
          isPending={state.analyzeMutation.isPending}
          onAnalyze={state.handleAnalyze}
          configId={configId}
          hasFiles={state.hasFiles}
        />
      </CardContent>
    </Card>
  );
}
