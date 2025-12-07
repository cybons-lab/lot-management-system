/**
 * WarehouseBulkImportDialog - 倉庫一括インポート
 */
import { useState, useCallback } from "react";

import { useBulkUpsertWarehouses } from "../hooks/useWarehouseMutations";
import type { BulkUpsertResponse, WarehouseBulkRow } from "../types/bulk-operation";
import { parseWarehouseCsv, generateEmptyTemplate, downloadCSV } from "../utils/warehouse-csv";

import { BaseBulkImportDialog } from "@/components/common/BaseBulkImportDialog";

export interface WarehouseBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WarehouseBulkImportDialog({ open, onOpenChange }: WarehouseBulkImportDialogProps) {
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
            created: 0,
            updated: 0,
            failed: parsedRows.length,
          },
          errors: [error.message],
        }),
    });
  }, [parsedRows, bulkUpsert]);

  const handleClose = useCallback(() => {
    handleClearFile();
    onOpenChange(false);
  }, [onOpenChange, handleClearFile]);

  const parsedCounts = {
    add: parsedRows.filter((r) => r.OPERATION === "ADD").length,
    upd: parsedRows.filter((r) => r.OPERATION === "UPD").length,
    del: parsedRows.filter((r) => r.OPERATION === "DEL").length,
  };

  return (
    <BaseBulkImportDialog
      open={open}
      onClose={handleClose}
      title="倉庫一括インポート"
      description="CSVファイルから倉庫データを一括でインポートします。"
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
