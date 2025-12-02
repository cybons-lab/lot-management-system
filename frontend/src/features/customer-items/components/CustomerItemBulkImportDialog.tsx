import { Upload, AlertCircle, FileText, X, Check, AlertTriangle } from "lucide-react";
import { useCallback, useRef } from "react";

import { bulkUpsertCustomerItems } from "../api";
import type { CustomerItemBulkRow } from "../types/bulk-operation";
import {
  downloadCSV,
  generateEmptyTemplate,
  parseCustomerItemCsv,
} from "../utils/customer-item-csv";

import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/layout/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBulkImport } from "@/shared/hooks/useBulkImport";

interface CustomerItemBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerItemBulkImportDialog({
  open,
  onOpenChange,
}: CustomerItemBulkImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    file,
    previewRows,
    parseErrors,
    importResult,
    isImporting,
    handleFileChange: baseHandleFileChange,
    handleImport,
    handleClose,
    setPreviewRows,
    setParseErrors,
  } = useBulkImport<CustomerItemBulkRow>({
    mutationFn: bulkUpsertCustomerItems,
    queryKey: ["customer-items"],
    onOpenChange,
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Call base handler to set file state
      baseHandleFileChange(e);

      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      try {
        const { rows, errors } = await parseCustomerItemCsv(selectedFile);
        setPreviewRows(rows);
        setParseErrors(errors);
      } catch (error) {
        setParseErrors(["CSVファイルの読み込み中にエラーが発生しました"]);
      }
    },
    [baseHandleFileChange, setPreviewRows, setParseErrors],
  );

  const handleDownloadTemplate = () => {
    const template = generateEmptyTemplate();
    downloadCSV(template, "customer_items_template.csv");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>得意先品番 一括インポート</DialogTitle>
          <DialogDescription>
            CSVファイルを使用して得意先品番を一括登録・更新します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden py-4">
          {!file ? (
            <div className="space-y-4 rounded-lg border-2 border-dashed p-12 text-center">
              <div className="flex justify-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <Upload className="text-primary h-8 w-8" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium">CSVファイルをドラッグ＆ドロップ</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  または クリックしてファイルを選択
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  ファイルを選択
                </Button>
                <Button variant="ghost" onClick={handleDownloadTemplate}>
                  <FileText className="mr-2 h-4 w-4" />
                  テンプレートをダウンロード
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col space-y-4">
              <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded p-2">
                    <FileText className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {parseErrors.length > 0 ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    CSVエラー
                  </div>
                  <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                    {parseErrors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {parseErrors.length > 5 && <li>他 {parseErrors.length - 5} 件のエラー</li>}
                  </ul>
                </div>
              ) : importResult ? (
                <div
                  className={`rounded-lg border p-4 ${
                    importResult.status === "success"
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    {importResult.status === "success" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={
                        importResult.status === "success" ? "text-green-800" : "text-red-800"
                      }
                    >
                      {importResult.status === "success"
                        ? "インポート完了"
                        : importResult.status === "partial"
                          ? "一部失敗"
                          : "インポート失敗"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">総件数:</span>
                      <span className="ml-2 font-medium">{importResult.summary.total}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-600">成功:</span>
                      <span className="ml-2">
                        {importResult.summary.created + importResult.summary.updated}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-red-600">失敗:</span>
                      <span className="ml-2">{importResult.summary.failed}</span>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-4 max-h-32 overflow-y-auto rounded bg-white/50 p-2">
                      <p className="mb-1 text-xs font-medium">エラー詳細:</p>
                      <ul className="list-inside list-disc space-y-1 text-xs">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
                  <div className="bg-muted flex items-center justify-between border-b px-4 py-2 text-sm font-medium">
                    <span>プレビュー ({previewRows.length}件)</span>
                    <span className="text-muted-foreground text-xs">
                      ※ 上位100件のみ表示しています
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">No.</TableHead>
                          <TableHead>得意先コード</TableHead>
                          <TableHead>得意先品番</TableHead>
                          <TableHead>製品コード</TableHead>
                          <TableHead>基本単位</TableHead>
                          <TableHead>梱包単位</TableHead>
                          <TableHead>梱包数量</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.slice(0, 100).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row._rowNumber}</TableCell>
                            <TableCell>{row.customer_code}</TableCell>
                            <TableCell>{row.external_product_code}</TableCell>
                            <TableCell>{row.product_code}</TableCell>
                            <TableCell>{row.base_unit}</TableCell>
                            <TableCell>{row.pack_unit || "-"}</TableCell>
                            <TableCell>{row.pack_quantity || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            キャンセル
          </Button>
          {file && !importResult && parseErrors.length === 0 && (
            <Button onClick={handleImport} disabled={isImporting || previewRows.length === 0}>
              {isImporting ? "インポート中..." : "インポート実行"}
            </Button>
          )}
          {importResult && <Button onClick={handleClose}>閉じる</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
