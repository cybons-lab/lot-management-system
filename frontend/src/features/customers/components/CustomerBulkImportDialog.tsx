/**
 * CustomerBulkImportDialog
 * 得意先一括インポートダイアログ
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState, useId, useCallback } from "react";

import { bulkUpsertCustomers } from "../api";
import { bulkImport as styles } from "../pages/styles";
import type { BulkUpsertResponse, CustomerBulkRow } from "../types/bulk-operation";
// import { parseCustomerCsv, generateEmptyTemplate, downloadCSV } from "../utils/customer-csv";

import { Button, Input, Label } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/layout/dialog";

// ============================================
// Props
// ============================================

export interface CustomerBulkImportDialogProps {
  /** ダイアログ表示状態 */
  open: boolean;
  /** ダイアログを閉じるコールバック */
  onOpenChange: (open: boolean) => void;
}

// ============================================
// Component
// ============================================

export function CustomerBulkImportDialog({ open, onOpenChange }: CustomerBulkImportDialogProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<CustomerBulkRow[]>([]);
  const [importResult, setImportResult] = useState<BulkUpsertResponse | null>(null);

  const queryClient = useQueryClient();
  const { mutate: bulkUpsert, isPending } = useMutation({
    mutationFn: (rows: CustomerBulkRow[]) => bulkUpsertCustomers(rows),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setImportResult(result);
    },
    onError: (error) => {
      setImportResult({
        status: "failed",
        summary: {
          total: parsedRows.length,
          added: 0,
          updated: 0,
          deleted: 0,
          failed: parsedRows.length,
        },
        results: [
          {
            rowNumber: 0,
            success: false,
            errorMessage: error.message,
          },
        ],
      });
    },
  });

  // ファイル選択ハンドラ
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    // TODO: Backend import implementation
    alert("現在バックエンドインポート機能へ移行中です。この機能は一時的に利用できません。");
    /*
    const { rows, errors } = await parseCustomerCsv(selectedFile);
    setParsedRows(rows);
    setParseErrors(errors);
    */
  }, []);

  // ファイルクリア
  const handleClearFile = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setParseErrors([]);
    setImportResult(null);
  }, []);

  // テンプレートダウンロード
  const handleDownloadTemplate = useCallback(() => {
    // TODO: Backend template download
    alert("現在バックエンドインポート機能へ移行中です。");
    /*
    const template = generateEmptyTemplate();
    downloadCSV(template, "customers_import_template.csv");
    */
  }, []);

  // インポート実行
  const handleImport = useCallback(() => {
    if (parsedRows.length === 0) return;

    bulkUpsert(parsedRows);
  }, [parsedRows, bulkUpsert]);

  // ダイアログを閉じる
  const handleClose = useCallback(() => {
    handleClearFile();
    onOpenChange(false);
  }, [onOpenChange, handleClearFile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>得意先一括インポート</DialogTitle>
          <DialogDescription>
            CSVファイルから得意先データを一括でインポートします。
            OPERATION列でADD（追加）/UPD（更新）/DEL（削除）を指定してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* テンプレートダウンロード */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm text-gray-600">インポート用テンプレートをダウンロード</span>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              テンプレート取得
            </Button>
          </div>

          {/* ファイルアップロード */}
          {!file ? (
            <div className={styles.dropzone}>
              <Upload className={styles.icon} />
              <div className="mt-4">
                <Label htmlFor={inputId} className="cursor-pointer">
                  <span className="text-blue-600 hover:underline">ファイルを選択</span>
                  またはドラッグ&ドロップ
                </Label>
                <Input
                  id={inputId}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="mt-2 text-sm text-gray-500">CSV形式のみ対応</p>
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

              {/* パースエラー */}
              {parseErrors.length > 0 && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    ファイル解析エラー
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-red-700">
                    {parseErrors.slice(0, 5).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {parseErrors.length > 5 && (
                      <li className="text-red-600">...他 {parseErrors.length - 5} 件のエラー</li>
                    )}
                  </ul>
                </div>
              )}

              {/* パース結果サマリ */}
              {parsedRows.length > 0 && parseErrors.length === 0 && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    {parsedRows.length} 件のデータを読み込みました
                  </div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span>追加: {parsedRows.filter((r) => r.OPERATION === "ADD").length}件</span>
                    <span>更新: {parsedRows.filter((r) => r.OPERATION === "UPD").length}件</span>
                    <span>削除: {parsedRows.filter((r) => r.OPERATION === "DEL").length}件</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* インポート結果 */}
          {importResult && (
            <div className={styles.results}>
              <div className="flex items-center gap-2 text-lg font-semibold">
                {importResult.status === "success" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800">インポート完了</span>
                  </>
                ) : importResult.status === "partial" ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-800">一部エラー</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-800">インポート失敗</span>
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

              {/* エラー詳細 */}
              {importResult.results.filter((r) => !r.success).length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700">エラー詳細:</p>
                  <ul className="mt-1 space-y-1">
                    {importResult.results
                      .filter((r) => !r.success)
                      .slice(0, 10)
                      .map((r, i) => (
                        <li key={i} className={styles.resultItem({ status: "error" })}>
                          <XCircle className="h-4 w-4" />行{r.rowNumber}: {r.errorMessage}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
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
