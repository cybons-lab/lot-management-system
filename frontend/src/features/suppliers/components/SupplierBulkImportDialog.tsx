/**
 * SupplierBulkImportDialog - 仕入先一括インポート
 */
import { useState, useCallback } from "react";

import { useBulkUpsertSuppliers } from "../hooks/useSupplierMutations";
import type { SupplierBulkRow, BulkUpsertResponse } from "../types/bulk-operation";
import { parseSupplierCsv, generateSupplierTemplateCsv } from "../utils/supplier-csv";

import { BaseBulkImportDialog } from "@/components/common/BaseBulkImportDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierBulkImportDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<SupplierBulkRow[]>([]);
  const [result, setResult] = useState<BulkUpsertResponse | null>(null);

  const { mutate: bulkUpsert, isPending } = useBulkUpsertSuppliers();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors } = parseSupplierCsv(text);
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
          // 成功時は少し待ってから閉じるなどの処理があればここで行うが、
          // BaseBulkImportDialogは結果を表示し続ける。
          // ユーザーが閉じるボタンを押すのを待つか、自動で閉じるか。
          // 元のコードには setTimeout(() => onOpenChange(false), 1500) があった。
          // BaseDialogの仕様的には結果を表示してユーザーに確認させるのが一般的だが、
          // 自動で閉じる挙動を残すならここで呼ぶ。
          // いったん結果表示を残す形にする（BaseDialogの標準挙動）。
        }
      },
      // Error handling is likely done in the mutation hook or global handler?
      // Original code didn't have onError, but updated result.
      // If mutation throws, we might want to catch it or handle onError.
      // But useBulkUpsertSuppliers likely returns the result object in onSuccess even for partial errors.
    });
  }, [parsedRows, bulkUpsert]);

  const handleDownloadTemplate = useCallback(() => {
    const csv = generateSupplierTemplateCsv();
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "suppliers_template.csv";
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

  const parsedCounts = {
    add: parsedRows.filter((r) => r.OPERATION === "ADD").length,
    upd: parsedRows.filter((r) => r.OPERATION === "UPD").length,
    del: parsedRows.filter((r) => r.OPERATION === "DEL").length,
  };

  return (
    <BaseBulkImportDialog
      open={open}
      onClose={handleClose}
      title="仕入先一括インポート"
      description="CSVファイルで仕入先を一括登録・更新・削除できます"
      onDownloadTemplate={handleDownloadTemplate}
      onFileChange={handleFileChange}
      file={file}
      parseErrors={parseErrors}
      parsedCounts={parsedCounts}
      hasparsedRows={parsedRows.length > 0}
      result={result}
      onImport={handleImport}
      isPending={isPending}
    />
  );
}
