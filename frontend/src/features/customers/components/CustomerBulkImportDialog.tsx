/**
 * CustomerBulkImportDialog
 * 得意先一括インポートダイアログ
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";

import { bulkUpsertCustomers } from "../api";
import type { BulkUpsertResponse, CustomerBulkRow } from "../types/bulk-operation";
import { parseCustomerCsv, generateEmptyTemplate, downloadCSV } from "../utils/customer-csv";

import { BaseBulkImportDialog } from "@/components/common/BaseBulkImportDialog";

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
          created: 0,
          updated: 0,
          failed: parsedRows.length,
        },
        errors: [error.message],
      });
    },
  });

  // ファイル選択ハンドラ
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors } = parseCustomerCsv(text);
      setParsedRows(rows);
      setParseErrors(errors);
    };
    reader.readAsText(selectedFile);
  }, []);

  // テンプレートダウンロード
  const handleDownloadTemplate = useCallback(() => {
    const template = generateEmptyTemplate();
    downloadCSV(template, "customers_import_template.csv");
  }, []);

  // インポート実行
  const handleImport = useCallback(() => {
    if (parsedRows.length === 0) return;

    bulkUpsert(parsedRows);
  }, [parsedRows, bulkUpsert]);

  // ダイアログを閉じる
  const handleClose = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setParseErrors([]);
    setImportResult(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const parsedCounts = {
    add: parsedRows.filter((r) => r.OPERATION === "ADD").length,
    upd: parsedRows.filter((r) => r.OPERATION === "UPD").length,
    del: parsedRows.filter((r) => r.OPERATION === "DEL").length,
  };

  return (
    <BaseBulkImportDialog
      open={open}
      onClose={handleClose}
      title="得意先一括インポート"
      description="CSVファイルから得意先データを一括でインポートします。OPERATION列でADD（追加）/UPD（更新）/DEL（削除）を指定してください。"
      onDownloadTemplate={handleDownloadTemplate}
      onFileChange={handleFileChange}
      file={file}
      parseErrors={parseErrors}
      parsedCounts={parsedCounts}
      hasparsedRows={parsedRows.length > 0}
      result={importResult}
      onImport={handleImport}
      isPending={isPending}
    />
  );
}
