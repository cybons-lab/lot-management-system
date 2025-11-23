/**
 * ProductBulkImportDialog - 商品一括インポート
 */
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import { useState, useCallback } from "react";

import { useBulkUpsertProducts } from "../hooks/useProductMutations";
import type { ProductBulkRow, BulkUpsertResponse } from "../types/bulk-operation";
import { parseProductCsv, generateProductTemplateCsv } from "../utils/product-csv";

import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/layout/dialog";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductBulkImportDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ProductBulkRow[]>([]);
  const [result, setResult] = useState<BulkUpsertResponse | null>(null);

  const { mutate: bulkUpsert, isPending } = useBulkUpsertProducts();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors } = parseProductCsv(text);
      setParseErrors(errors);
      setParsedRows(rows);
    };
    reader.readAsText(f);
  }, []);

  const handleImport = useCallback(() => {
    if (parsedRows.length === 0) return;
    bulkUpsert(parsedRows, {
      onSuccess: (res) => {
        setResult(res);
        if (res.status === "success") {
          setTimeout(() => onOpenChange(false), 1500);
        }
      },
    });
  }, [parsedRows, bulkUpsert, onOpenChange]);

  const handleDownloadTemplate = useCallback(() => {
    const csv = generateProductTemplateCsv();
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleClose = useCallback(() => {
    setFile(null);
    setParseErrors([]);
    setParsedRows([]);
    setResult(null);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>商品一括インポート</DialogTitle>
          <DialogDescription>CSVファイルで商品を一括登録・更新・削除できます</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            テンプレートをダウンロード
          </Button>

          <div className="rounded-lg border-2 border-dashed p-4 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="product-csv-input"
            />
            <label htmlFor="product-csv-input" className="cursor-pointer">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">{file ? file.name : "CSVファイルを選択"}</p>
            </label>
          </div>

          {parseErrors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">エラー</span>
              </div>
              <ul className="mt-2 list-inside list-disc text-sm text-red-600">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedRows.length > 0 && parseErrors.length === 0 && (
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm text-blue-600">
                {parsedRows.filter((r) => r.OPERATION === "ADD").length}件追加、
                {parsedRows.filter((r) => r.OPERATION === "UPD").length}件更新、
                {parsedRows.filter((r) => r.OPERATION === "DEL").length}件削除
              </p>
            </div>
          )}

          {result && (
            <div
              className={`rounded-lg p-3 ${result.status === "success" ? "bg-green-50" : result.status === "partial" ? "bg-yellow-50" : "bg-red-50"}`}
            >
              <div className="flex items-center gap-2">
                {result.status === "success" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
                <span className="font-medium">
                  {result.status === "success" ? "完了" : "一部失敗"}
                </span>
              </div>
              <p className="mt-1 text-sm">
                追加: {result.summary.added}, 更新: {result.summary.updated}, 削除:{" "}
                {result.summary.deleted}, 失敗: {result.summary.failed}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button
              onClick={handleImport}
              disabled={isPending || parsedRows.length === 0 || parseErrors.length > 0}
            >
              {isPending ? "処理中..." : "インポート実行"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
