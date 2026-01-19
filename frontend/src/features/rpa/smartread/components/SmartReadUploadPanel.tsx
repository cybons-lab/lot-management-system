/* eslint-disable max-lines-per-function */
import { Upload, FileText, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useAnalyzeFile } from "../hooks";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

interface SmartReadUploadPanelProps {
  configId: number;
  onAnalyzeSuccess: () => void;
}

export function SmartReadUploadPanel({ configId, onAnalyzeSuccess }: SmartReadUploadPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeMutation = useAnalyzeFile();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
    // Reset value
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
    if (!configId || selectedFiles.length === 0) return;

    let successCount = 0;

    for (const file of selectedFiles) {
      try {
        const result = await analyzeMutation.mutateAsync({
          configId,
          file,
        });
        if (result.success) {
          successCount++;
        } else {
          toast.error(`"${file.name}" の解析に失敗: ${result.error_message}`);
        }
      } catch {
        // Ignore error here, handled in mutation
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount}件のファイルを解析しました`);
      setSelectedFiles([]);
      onAnalyzeSuccess();
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>ファイルアップロード</CardTitle>
        <CardDescription>解析するPDFまたは画像ファイルを選択してください</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/50"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            クリックまたはドラッグ&ドロップでファイルを選択
          </p>
          <p className="mt-1 text-xs text-gray-400">PDF, PNG, JPG, JPEG形式に対応</p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
                <FileText className="h-8 w-8 text-indigo-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
                  }}
                >
                  削除
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          className="w-full"
          disabled={!configId || selectedFiles.length === 0 || analyzeMutation.isPending}
          onClick={handleAnalyze}
        >
          {analyzeMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              解析中...
            </>
          ) : (
            "解析開始"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
