/**
 * 出荷用マスタExcelインポートダイアログ
 */

/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import {
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form";
import httpClient from "@/shared/api/http-client";

interface ImportResponse {
  success: boolean;
  imported_count: number;
  curated_count: number;
  errors?: string[];
  warnings?: string[];
}

export function ShippingMasterImportDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [syncPolicy, setSyncPolicy] = useState<string>("create-only");

  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await httpClient.post(
        `shipping-masters/import?auto_sync=${autoSync}&sync_policy=${syncPolicy}`,
        {
          body: formData,
        },
      );
      return response.json<ImportResponse>();
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["shipping-masters"] });
        setOpen(false);
        setFile(null);
        // TODO: 成功トースト表示
        console.log(`Import success: ${response.curated_count}件のデータをインポートしました`);
      } else {
        setError(`インポートエラー: ${response.errors?.join(", ")}`);
      }
    },
    onError: (err: Error) => {
      setError(`インポート失敗: ${err.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
      setError("Excelファイル (.xlsx または .xls) を選択してください");
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleImport = () => {
    if (!file) return;
    importMutation.mutate(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Excelインポート
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>出荷用マスタExcelインポート</DialogTitle>
          <DialogDescription>
            Excelファイルを選択してアップロードします。ファイル形式はxlsxまたはxlsです。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          {file && (
            <div className="text-sm">
              <p className="font-medium">選択されたファイル: {file.name}</p>
              <p className="text-muted-foreground">サイズ: {(file.size / 1024).toFixed(2)} KB</p>
            </div>
          )}

          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="autoSync"
              checked={autoSync}
              onCheckedChange={(checked) => setAutoSync(!!checked)}
            />
            <Label
              htmlFor="autoSync"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              インポート後にマスターへ自動同期する
            </Label>
          </div>

          {autoSync && (
            <div className="space-y-2 py-2">
              <Label htmlFor="syncPolicy" className="text-sm font-medium">
                同期ポリシー
              </Label>
              <Select value={syncPolicy} onValueChange={setSyncPolicy}>
                <SelectTrigger id="syncPolicy">
                  <SelectValue placeholder="ポリシーを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create-only">新規作成のみ</SelectItem>
                  <SelectItem value="update-if-empty">空項目のみ更新</SelectItem>
                  <SelectItem value="upsert">既存データを上書き</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                ※既にマスターにデータがある場合の処理を選択します。
              </p>
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={importMutation.isPending}
          >
            キャンセル
          </Button>
          <Button onClick={handleImport} disabled={!file || importMutation.isPending}>
            {importMutation.isPending ? "インポート中..." : "インポート"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
