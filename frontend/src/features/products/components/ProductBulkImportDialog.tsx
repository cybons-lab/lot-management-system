/**
 * ProductBulkImportDialog - 商品一括インポート
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { toast } from "sonner";

import { bulkUpsertProducts } from "../api";
import type { ProductBulkRow, BulkUpsertResponse } from "../types/bulk-operation";
import { parseProductCsv, generateProductTemplateCsv } from "../utils/product-csv";

import { BaseBulkImportDialog } from "@/components/common/BaseBulkImportDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductBulkImportDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ProductBulkRow[]>([]);
  const [result, setResult] = useState<BulkUpsertResponse | null>(null);

  const queryClient = useQueryClient();
  const { mutate: bulkUpsert, isPending } = useMutation({
    mutationFn: (rows: ProductBulkRow[]) => bulkUpsertProducts(rows),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      const { summary } = result;
      if (result.status === "success") {
        toast.success(`${summary.total}件の処理が完了しました`);
      } else if (result.status === "partial") {
        toast.warning(`${summary.total}件中${summary.failed}件が失敗しました`);
      } else {
        toast.error("すべての処理が失敗しました");
      }
    },
    onError: () => toast.error("一括処理に失敗しました"),
  });

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

  const parsedCounts = {
    add: parsedRows.filter((r) => r.OPERATION === "ADD").length,
    upd: parsedRows.filter((r) => r.OPERATION === "UPD").length,
    del: parsedRows.filter((r) => r.OPERATION === "DEL").length,
  };

  return (
    <BaseBulkImportDialog
      open={open}
      onClose={handleClose}
      title="商品一括インポート"
      description="CSVファイルで商品を一括登録・更新・削除できます"
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
