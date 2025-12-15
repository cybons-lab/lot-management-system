/**
 * useMasterImport - マスタインポートのカスタムフック
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { uploadMasterImport } from "../api";
import type { MasterImportResponse, TemplateGroup } from "../types";

/**
 * テンプレートをダウンロードするヘルパー関数
 */
async function downloadTemplate(group: TemplateGroup): Promise<void> {
  let endpoint: string;
  if (group === "supply") {
    endpoint = "/masters/suppliers/template/download?format=xlsx";
  } else if (group === "delivery_place") {
    endpoint = "/masters/delivery-places/template/download?format=xlsx";
  } else {
    endpoint = "/masters/customers/template/download?format=xlsx";
  }

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "/api"}${endpoint}`);
  if (!response.ok) {
    throw new Error("テンプレートのダウンロードに失敗しました");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `master_import_template_${group}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function useMasterImport() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<MasterImportResponse | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.toLowerCase().split(".").pop();
    if (!ext || !["xlsx", "json", "yaml", "yml"].includes(ext)) {
      toast.error("サポートされていないファイル形式です。Excel, JSON, YAMLをご利用ください。");
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
    setResult(null);
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await uploadMasterImport(file, dryRun);
      setResult(response);

      if (response.status === "success") {
        toast.success(
          dryRun ? "検証が完了しました。問題はありません。" : "インポートが完了しました。",
        );
      } else if (response.status === "partial") {
        toast.warning("一部のデータでエラーが発生しました。");
      } else {
        toast.error("インポートに失敗しました。");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "インポート中にエラーが発生しました";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [file, dryRun]);

  const handleDownloadTemplate = useCallback(async (group: TemplateGroup) => {
    setIsDownloadingTemplate(true);
    try {
      await downloadTemplate(group);
      toast.success("テンプレートをダウンロードしました");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "テンプレートのダウンロードに失敗しました";
      toast.error(message);
    } finally {
      setIsDownloadingTemplate(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setResult(null);
    setDryRun(true);
  }, []);

  return {
    file,
    dryRun,
    setDryRun,
    isUploading,
    result,
    isDownloadingTemplate,
    handleFileChange,
    handleImport,
    handleDownloadTemplate,
    handleClear,
  };
}
