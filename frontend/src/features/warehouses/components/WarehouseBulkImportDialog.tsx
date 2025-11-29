/**
 * WarehouseBulkImportDialog - 倉庫一括インポート
 */
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState, useId, useCallback } from "react";

import { useBulkUpsertWarehouses } from "../hooks/useWarehouseMutations";
import { bulkImport as styles } from "../pages/styles";
import type { BulkUpsertResponse, WarehouseBulkRow } from "../types/bulk-operation";
import { parseWarehouseCsv, generateEmptyTemplate, downloadCSV } from "../utils/warehouse-csv";

import { Button, Input, Label } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/layout/dialog";

export interface WarehouseBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WarehouseBulkImportDialog({ open, onOpenChange }: WarehouseBulkImportDialogProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<WarehouseBulkRow[]>([]);
  const [importResult, setImportResult] = useState<BulkUpsertResponse | null>(null);
  const { mutate: bulkUpsert, isPending } = useBulkUpsertWarehouses();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setImportResult(null);
    const { rows, errors } = await parseWarehouseCsv(selectedFile);
    setParsedRows(rows);
    setParseErrors(errors);
  }, []);

  const handleClearFile = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setParseErrors([]);
    setImportResult(null);
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    downloadCSV(generateEmptyTemplate(), "warehouses_import_template.csv");
  }, []);

  const handleImport = useCallback(() => {
    if (parsedRows.length === 0) return;
    bulkUpsert(parsedRows, {
      onSuccess: (result) => setImportResult(result),
      onError: (error) =>
        setImportResult({
          status: "failed",
          summary: {
            total: parsedRows.length,
            added: 0,
            updated: 0,
            deleted: 0,
            failed: parsedRows.length,
          },
          results: [{ rowNumber: 0, success: false, errorMessage: error.message }],
        }),
    });
  }, [parsedRows, bulkUpsert]);

  const handleClose = useCallback(() => {
    handleClearFile();
    onOpenChange(false);
  }, [onOpenChange, handleClearFile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>倉庫一括インポート</DialogTitle>
          <DialogDescription>CSVファイルから倉庫データを一括でインポートします。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm text-gray-600">インポート用テンプレート</span>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              テンプレート取得
            </Button>
          </div>
          {!file ? (
            <div className={styles.dropzone}>
              <Upload className={styles.icon} />
              <div className="mt-4">
                <Label htmlFor={inputId} className="cursor-pointer">
                  <span className="text-blue-600 hover:underline">ファイルを選択</span>
                </Label>
                <Input
                  id={inputId}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearFile}>
                  クリア
                </Button>
              </div>
              {parseErrors.length > 0 && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    解析エラー
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-red-700">
                    {parseErrors.slice(0, 5).map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {parsedRows.length > 0 && parseErrors.length === 0 && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    {parsedRows.length} 件読み込み
                  </div>
                </div>
              )}
            </div>
          )}
          {importResult && (
            <div className={styles.results}>
              <div className="flex items-center gap-2 text-lg font-semibold">
                {importResult.status === "success" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800">完了</span>
                  </>
                ) : importResult.status === "partial" ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-800">一部エラー</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-800">失敗</span>
                  </>
                )}
              </div>
              <div className={`mt-3 ${styles.summary}`}>
                <span className={styles.summaryLabel}>総件数:</span>
                <span className={styles.summaryValue}>{importResult.summary.total}</span>
                <span className={styles.summaryLabel}>追加:</span>
                <span className={styles.summaryValue}>{importResult.summary.added}</span>
                <span className={styles.summaryLabel}>更新:</span>
                <span className={styles.summaryValue}>{importResult.summary.updated}</span>
                <span className={styles.summaryLabel}>削除:</span>
                <span className={styles.summaryValue}>{importResult.summary.deleted}</span>
                <span className={styles.summaryLabel}>失敗:</span>
                <span className={`${styles.summaryValue} text-red-600`}>
                  {importResult.summary.failed}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            {importResult ? "閉じる" : "キャンセル"}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={isPending || parsedRows.length === 0 || parseErrors.length > 0}
            >
              {isPending ? "インポート中..." : "インポート実行"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
