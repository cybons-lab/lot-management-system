/**
 * UomConversionBulkImportDialog
 * 単位換算一括インポートダイアログ
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

import { bulkUpsertUomConversions } from "../api";
import type { UomConversionBulkRow } from "../types/bulk-operation";
// import { parseUomConversionCsv } from "../utils/uom-conversion-csv";

import { Button, Input } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/layout/dialog";
import type { BulkUpsertResponse } from "@/shared/types/bulk-operations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UomConversionBulkImportDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<UomConversionBulkRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<BulkUpsertResponse | null>(null);

  const queryClient = useQueryClient();

  const { mutate: executeImport, isPending: isImporting } = useMutation({
    mutationFn: (rows: UomConversionBulkRow[]) => bulkUpsertUomConversions(rows),
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["uom-conversions"] });

      if (result.status === "success") {
        toast.success(`${result.summary.total}件の処理が完了しました`);
      } else if (result.status === "partial") {
        toast.warning(`${result.summary.total}件中${result.summary.failed}件が失敗しました`);
      } else {
        toast.error("すべての処理が失敗しました");
      }
    },
    onError: () => {
      toast.error("インポート中にエラーが発生しました");
    },
  });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    // TODO: Backend import implementation
    alert("現在バックエンドインポート機能へ移行中です。この機能は一時的に利用できません。");
    /*
        try {
            const text = await selectedFile.text();
            const { rows, errors } = parseUomConversionCsv(text);
            setPreviewRows(rows);
            setParseErrors(errors);
        } catch (error) {
            console.error(error);
            setParseErrors(["ファイルの読み込みに失敗しました"]);
            setPreviewRows([]);
        }
        */
  }, []);

  const handleImport = useCallback(() => {
    if (previewRows.length === 0 || parseErrors.length > 0) return;
    executeImport(previewRows);
  }, [previewRows, parseErrors, executeImport]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setFile(null);
      setPreviewRows([]);
      setParseErrors([]);
      setImportResult(null);
    }, 300);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>単位換算一括インポート</DialogTitle>
          <DialogDescription>
            CSVファイルをアップロードして、単位換算を一括登録します。（更新・削除は現在未対応）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ファイルアップロード */}
          <div className="space-y-2">
            <label className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              CSVファイル選択
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isImporting}
                className="cursor-pointer"
              />
            </div>
            <p className="text-xs text-slate-500">
              ※ヘッダー行が必要です: OPERATION, product_code, product_name, external_unit,
              conversion_factor, remarks
            </p>
          </div>

          {/* パースエラー表示 */}
          {parseErrors.length > 0 && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">CSV読み込みエラー</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc space-y-1 pl-5">
                      {parseErrors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {parseErrors.length > 5 && <li>他 {parseErrors.length - 5} 件のエラー</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* プレビュー表示 */}
          {previewRows.length > 0 && parseErrors.length === 0 && !importResult && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">プレビュー ({previewRows.length}件)</h3>
              <div className="overflow-hidden rounded-md border border-slate-200">
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                          No
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                          操作
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                          製品CD
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                          外部単位
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                          換算係数
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {previewRows.slice(0, 100).map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-xs text-slate-500">{row._rowNumber}</td>
                          <td className="px-3 py-2 text-xs font-medium">
                            <span
                              className={
                                row.OPERATION === "ADD"
                                  ? "text-blue-600"
                                  : row.OPERATION === "UPD"
                                    ? "text-green-600"
                                    : "text-red-600"
                              }
                            >
                              {row.OPERATION}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-900">{row.product_code}</td>
                          <td className="px-3 py-2 text-xs text-slate-900">{row.external_unit}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {row.conversion_factor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewRows.length > 100 && (
                  <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
                    他 {previewRows.length - 100} 件...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 実行結果表示 */}
          {importResult && (
            <div className="space-y-4">
              <div
                className={`rounded-md p-4 ${
                  importResult.status === "success"
                    ? "bg-green-50"
                    : importResult.status === "partial"
                      ? "bg-yellow-50"
                      : "bg-red-50"
                }`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {importResult.status === "success" ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : importResult.status === "partial" ? (
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3
                      className={`text-sm font-medium ${
                        importResult.status === "success"
                          ? "text-green-800"
                          : importResult.status === "partial"
                            ? "text-yellow-800"
                            : "text-red-800"
                      }`}
                    >
                      インポート完了
                    </h3>
                    <div className="mt-2 text-sm">
                      <p>
                        総数: {importResult.summary.total} / 成功:{" "}
                        {importResult.summary.added +
                          importResult.summary.updated +
                          importResult.summary.deleted}{" "}
                        / 失敗: {importResult.summary.failed}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* エラー詳細 */}
              {importResult.results.filter((r) => !r.success).length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto rounded-md border p-2">
                  <p className="mb-2 text-sm font-medium text-gray-700">エラー詳細:</p>
                  <ul className="space-y-1">
                    {importResult.results
                      .filter((r) => !r.success)
                      .slice(0, 50)
                      .map((r, i) => (
                        <li key={i} className="flex items-start gap-1 text-xs text-red-600">
                          <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                          <span>
                            行{r.rowNumber}: {r.errorMessage}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            {importResult ? "閉じる" : "キャンセル"}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={!file || previewRows.length === 0 || parseErrors.length > 0 || isImporting}
            >
              {isImporting && <Upload className="mr-2 h-4 w-4 animate-spin" />}
              {!isImporting && <Upload className="mr-2 h-4 w-4" />}
              インポート実行
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
