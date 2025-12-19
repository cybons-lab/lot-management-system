/**
 * CsvImportPage
 * CSV取込画面（一時使用 - 素材納品書ワークフロー用）
 */

import { Upload } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useCreateRun } from "../hooks";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function CsvImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV取込
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const createRunMutation = useCreateRun();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCsvUpload = async () => {
    if (!selectedFile) {
      toast.error("CSVファイルを選択してください");
      return;
    }

    try {
      const result = await createRunMutation.mutateAsync(selectedFile);
      toast.info("詳細ページへ移動します...");
      // 作成されたRunの詳細ページへ遷移
      navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUN_DETAIL(result.id));
    } catch {
      // エラーはhooksでハンドリング済み
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="CSV取込"
        subtitle="CSVファイルをアップロードしてデータを登録します。（一時使用）"
      />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* CSV取込セクション */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            <Upload className="mr-2 inline-block h-5 w-5" />
            CSV取込
          </h2>

          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  ファイルを選択
                </Button>
                <span className="text-sm text-gray-600">
                  {selectedFile ? selectedFile.name : "ファイルが選択されていません"}
                </span>
              </div>
            </div>

            <Button
              onClick={handleCsvUpload}
              disabled={!selectedFile || createRunMutation.isPending}
              className="w-full"
            >
              {createRunMutation.isPending ? "取込中..." : "CSV取込実行"}
            </Button>
          </div>
        </div>

        {/* 戻るボタン */}
        <Button variant="outline" onClick={() => navigate(ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT)}>
          ← RPAメニューへ戻る
        </Button>
      </div>
    </PageContainer>
  );
}
